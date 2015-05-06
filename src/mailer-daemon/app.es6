import 'babel/polyfill';
import nano from 'nano';
import url from 'url';
import nodemailer from 'nodemailer';
import rabbit from 'rabbit.js';
import moment from 'moment';
import schedule from 'node-schedule';
import member from '../models/member.js';
import Ractive from 'ractive';
import { text2html, randomValueHex, html2text } from '../mailUtils';

console.info('MAILER-DAEMON: Environment variables');
console.info('\tMCM_DB:', process.env.MCM_DB);
console.info('\tMCM_MAIL_HOST:', process.env.MCM_MAIL_HOST);
console.info('\tMCM_RABBIT_URL:', process.env.MCM_RABBIT_URL);

let mailHost = process.env.MCM_MAIL_HOST || true;
let transporter = nodemailer.createTransport({
  port: 587,
  host: mailHost,
  authMethod: 'CRAM-MD5',
  auth: {
    user: 'republichog',
    pass: 'antigone123.'
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.info('MAILER-DAEMON: Transport created');

let rabbitUrl = process.env.MCM_RABBIT_URL || true;

let dburl = process.env.MCM_DB;
let masterdburl = url.resolve(dburl, '/mcm-master');
let masterdb = nano(masterdburl);
let accountdbs = new Map();

function promisify(scope, method) {
  let args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  let fn = scope[method].bind.apply(scope[method], args);
  return new Promise((good, bad) => {
    fn((err, value) => {
      if (err && err.status_code !== 404) {
        return bad(err);
      }
      try {
        good(value);
      } catch (e) {
        bad(e);
      }
    });
  });
}

function mergeCouchInsert(db, doc) {
  return promisify(db, 'insert', doc)
    .then(result => {
      doc._id = result._id;
      doc._rev = result._rev;
    });
}

function getAccountDb(subdomain) {
  if (!accountdbs.has(subdomain)) {
    accountdbs.set(subdomain, nano(url.resolve(dburl, subdomain)));
  }
  return accountdbs.get(subdomain);
}

function fetchMail({ subdomain, id }) {
  let db = getAccountDb(subdomain);
  return promisify(db, 'get', id)
    .then(email => {
      email.db = db;
      return email;
    });
}

function fetchDiscussion({ subdomain, id }) {
  let db = getAccountDb(subdomain);
  let email = {
    from: null,
    html: null,
    messageId: null,
    group: { view: 'discussionRecipients' },
    sent: null,
    subject: null,
    text: null,
    headers: {},
    db: db
  };
  return promisify(db, 'get', id)
    .then(discussion => {
      email.html = text2html(discussion.content);
      email.messageId = `${randomValueHex(8)}.${discussion._id}@${subdomain}.ismymc.com`;
      email.sent = moment(discussion.createdOn).toDate();
      email.subject = discussion.title;
      email.text = discussion.content;
      email.from = `"Discussions" <${discussion._id}@${subdomain}.ismymc.com>`;
      email.headers['X-Discussion-Id'] = discussion._id;
      return promisify(db, 'get', discussion.authorId);
    })
    .then(author => {
      email.html = `<html><head><style>* { font-size: 16px; }</style></head>
      <body>
      <h1 style="font-size: 20px"><a href="http://${subdomain}.ismymc.com/chapter/discussions/${email.headers['X-Discussion-Id']}" style="text-decoration: none;">${email.subject}</a></h1>
      <h2 style="font-size: 18px">Written by ${author.firstName} ${author.lastName}</h2>
      ${email.html}
      </body>`;
      email.text = `${email.subject}
Written by ${author.firstName} ${author.lastName}

${email.text}`;
      return email;
    });
}

function fetchPolls({ subdomain, id, initiatorId }) {
  let db = getAccountDb(subdomain);
  let promises = [
    promisify(db, 'get', id),
    promisify(member.projections.onlyRoadCaptains, 'projection', db),
    promisify(db, 'get', id)
  ];
  return Promise.all(promises)
    .then(([ poll, roadCaptains, initiator ]) => {
      let sender = `"New Poll" <no-reply@${subdomain}.ismymc.com>`;
      let emails = [];

      for (let recipient of roadCaptains) {
        let data = {
          poll: poll,
          roadCaptain: recipient,
          subdomain: subdomain
        };
        let html = new Ractive({
          template: pollTemplate,
          data: data
        }).toHTML();
        let email = {
          from: sender,
          html: html,
          subject: poll.name,
          to: `"${recipient.firstName} ${recipient.lastName}" <${recipient.email}>`,
          text: "You must use an email client that can display HTML to respond to this poll.\n"
        };
        emails.push(email);
      }
      return {
        emails: emails,
        db: db
      };
    });
}

function populateRecipients(email) {
  let options = { include_docs: true };
  let db = email.db;
  delete email.db;
  console.info('\tProcessing email for:', email.group.view);
  return promisify(member.projections[email.group.view], 'projection', db)
    .then(members => {
      email.recipients = [];
      for (let m of members) {
        if (!m.email) {
          continue;
        }
        email.recipients.push({
          email: m.email,
          name: `"${m.firstName} ${m.lastName}"`,
          id: m._id,
          status: 'queued'
        });
      }
      return promisify(db, 'insert', email);
    })
    .then(() => {
      return {
        email,
        recipients: email.recipients,
        db: db
      };
    });
}

function mailMany(emails) {
  let promises = [];
  for (let email of emails) {
    let promise = promisify(transporter, 'sendMail', email);
    promises.push(promise);
  }
  return Promise.all(promises);
}

function mailAndMark({ email, recipients, db }) {
  let promises = [];
  for (let recipient of recipients) {
    let missive = {
      from: email.from,
      to: `${recipient.name} <${recipient.email}>`,
      subject: email.subject,
      text: email.text,
      html: email.html,
      messageId: email.messageId,
      headers: [
        { key: 'X-Recipient-Id', value: recipient.id },
        { key: 'x-mua', value: 'what.ismymc.com' }
      ]
    }
    let promise = promisify(transporter, 'sendMail', missive);
    promises.push(promise);
  }
  return Promise.all(promises);
}

/*****************************************************************************
                               ENTRY POINTS
*****************************************************************************/

/////////////////////////////////////////////////////////////////////////////
// START: RABBITMQ
let context = rabbit.createContext(rabbitUrl);

let group = {
  close() {}
};

let single = group;
let discussion = group;
let poll = group;

function fail(message, e) {
  console.error(message, e);
  context.close();
}

context.on('ready', () => {
  console.info('MAILER-DAEMON: Rabbit context ready.');
  group = context.socket('WORKER', { persistent: true });
  group.setEncoding('utf8');
  group.connect('mcm-group-mail', () => {
    console.info('MAILER-DAEMON: Connected to mcm-group-mail.');
    group.on('data', (directive) => {
      console.info('MAILER-DAEMON: Message received on mcm-group-mail.');
      console.info('\tCONTENT:', directive);
      directive = JSON.parse(directive);
      fetchMail(directive)
        .then(email => populateRecipients(email))
        .then(({ email, recipients, db }) => mailAndMark({ email, recipients, db }))
        .then(() => group.ack())
        .catch(e => {
          console.error(e, e.stack);
        });
    });
  });

  discussion = context.socket('WORKER', { persistent: true });
  discussion.setEncoding('utf8');
  discussion.connect('mcm-discussion-mail', () => {
    console.info('MAILER-DAEMON: Connected to mcm-discussion-mail.');
    discussion.on('data', (directive) => {
      console.info('MAILER-DAEMON: Message received on mcm-discussion-mail.');
      console.info('\tCONTENT:', directive);
      directive = JSON.parse(directive);
      fetchDiscussion(directive)
        .then(email => populateRecipients(email))
        .then(({ email, recipients, db }) => mailAndMark({ email, recipients, db }))
        .then(() => discussion.ack())
        .catch(e => {
          console.error(e, e.stack);
        });
    });
  });

  poll = context.socket('WORKER', { persistent: true });
  poll.setEncoding('utf8');
  poll.connect('mcm-poll-mail', () => {
    console.info('MAILER-DAEMON: Connected to mcm-poll-mail.');
    poll.on('data', (directive) => {
      console.info('MAILER-DAEMON: Message received on mcm-poll-mail.');
      console.info('\tCONTENT:', directive);
      directive = JSON.parse(directive);
      fetchPolls(directive)
        .then(({ emails, db }) => mailMany(emails))
        .then(() => poll.ack())
        .catch(e => {
          console.error(e, e.stack);
        });
    });
  });

  single = context.socket('WORKER', { persistent: true });
  single.setEncoding('utf8');
  single.connect('mcm-single-mail', () => {
    console.info('MAILER-DAEMON: Connected to mcm-single-mail.');
    single.on('data', (missive) => {
      console.info('MAILER-DAEMON: Message received on mcm-single-mail.');
      single.ack();
      missive = JSON.parse(missive);
      promisify(transporter, 'sendMail', missive)
        .catch(e => console.error('transporter error:', e));
    });
  });
});

context.on('close', (...rest) => console.log('Closing context.', rest) || process.exit());
context.on('error', e => fail('Context error', e));

process.on('SIGINT', () => context.close());
process.on('SIGTERM', () => context.close());
// END: RABBITMQ
/////////////////////////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////////////////////////
// START: SCHEDULED
let rule = new schedule.RecurrenceRule();
rule.hour = 2;

schedule.scheduleJob(rule, () => {
  promisify(masterdb, 'view', 'account', 'all')
    .then(accounts => {
      let now = new Date();
      let promises = [];
      let date = [ now.getFullYear(), now.getMonth(), now.getDate() ];
      for (let account of accounts) {
        let db = getAccountDb(account.subdomain);
        let options = { include_docs: true, key: date };
        promises.push(promisify(db, 'view', 'member', 'wantingCalendarEvents', { include_docs: true }));
        promises.push(promisify(db, 'view', 'event', 'byReminderDates', options));
        promises.push(promisify(db, 'view', 'ride', 'byReminderDates', options));
      }
      return Promise.all(promises);
    })
    .then(resultsBySubdomain => {
      for(let i = 0; i < resultsBySubdomain.length; i += 3) {
        members = resultsBySubdomain[i];
        events = resultsBySubdomain[i + 1];
        rides = resultsBySubdomain[i + 2];
      }
      let content = [];
      for (let i = 0; i < rides.length; i += 1) {
        content.push(new Ractive({
          template: eventTemplates.ride,
          data: { event: rides[i] }
        }).toHTML());
      }
      for (let i = 0; i < events.length; i += 1) {
        content.push(new Ractive({
          template: eventTemplates[events[i].activity],
          data: { event: events[i] }
        }).toHTML());
      }
      content = new Ractive({
        template: eventMailTemplate,
        data: { events: content }
      }).toHTML();

      let emails = [];
      for (let m of members) {
        emails.push({
          to: `"${m.firstName} ${m.lastName}" <m.email>`,
          from: '"Upcoming Chapter Events" <no-reply@what.ismymc.com>',
          subject: 'Upcoming Events',
          html: content,
          text: html2text(content)
        });
      }
      return mailMany(emails);
    })
    .catch(e => console.error(e));
});
// END: SCHEDULED
/////////////////////////////////////////////////////////////////////////////

let pollTemplate = `<html>
<head></head>
<body style="font-family:sans-serif;font-size:16px;">
<div>A new poll has opened:</div>
<div style="font-weight:bold;">{{ poll.name }}</div>
<div style="margin-top:1em;text-align:center;">
<a style="max-width:400px;background-color:#1CB841;color:white;border-radius:2px;box-sizing:border-box;font-weight:100;letter-spacing:0.01em;padding:8px 16px;text-align:center;text-decoration:none;vertical-align:middle;zoom:1;" href="http://{{ subdomain }}.ismymc.com/chapter/polls/{{ poll._id }}/0/{{ roadCaptain._id }}">{{ poll.options[0].name }}</a>
</div>
<div>&nbsp;</div>
<div style="margin-top:1em;text-align:center;">
<a style="max-width:400px;background-color:#42B8DD;color:white;border-radius:2px;box-sizing:border-box;font-weight:100;letter-spacing:0.01em;padding:8px 16px;text-align:center;text-decoration:none;vertical-align:middle;zoom:1;" href="http://{{ subdomain }}.ismymc.com/chapter/polls/{{ poll._id }}/1/{{ roadCaptain._id }}">{{ poll.options[1].name }}</a>
</div>
{{#if poll.options.length === 3}}
<div>&nbsp;</div>
<div style="margin-top:1em;text-align:center;">
<a style="max-width:400px;background-color:#E6E6E5;color:black;border-radius:2px;box-sizing:border-box;font-weight:100;letter-spacing:0.01em;padding:8px 16px;text-align:center;text-decoration:none;vertical-align:middle;zoom:1;" href="http://{{ subdomain }}.ismymc.com/chapter/polls/{{ poll._id }}/2/{{ roadCaptain._id }}">{{ poll.options[2].name }}</a>
</div>
{{/if}}
</body>
</html>`;

let eventTemplates = {
  meal: `<div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Meal:</span> {{ title }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">On:</span> {{ event.days[0].month + 1 }}/{{ event.days[0].date }}/{{ event.days[0].year }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">When:</span> {{ event.days[0].meetAt }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Where:</span> {{ event.days[0].location }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;margin-top:8px;">{{ event.days[0].description }}</div>`,
  meeting: `<div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Meeting:</span> {{ title }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">On:</span> {{ event.days[0].month + 1 }}/{{ event.days[0].date }}/{{ event.days[0].year }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">When:</span> {{ event.days[0].meetAt }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Where:</span> {{ event.days[0].location }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;margin-top:8px;">{{ event.days[0].description }}</div>`,
  movie: `<div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Movie:</span> {{ title }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">On:</span> {{ event.days[0].month + 1 }}/{{ event.days[0].date }}/{{ event.days[0].year }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">When:</span> {{ event.days[0].meetAt }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Where:</span> {{ event.days[0].location }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;margin-top:8px;">{{ event.days[0].description }}</div>`,
  ride: `<div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Ride:</span> {{ title }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">On:</span> {{ event.days[0].month + 1 }}/{{ event.days[0].date }}/{{ event.days[0].year }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Meet at:</span> {{ event.days[0].meetAt }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">KSU:</span> {{ event.days[0].ksuAt }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Start from:</span> {{ event.days[0].startFrom }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Going to:</span> {{ event.days[0].destination }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;"><span style="font-weight:bold">Led by:</span> {{ event.days[0].roadCaptain }}</div>
    <div style="font-family:Helvetica,Arial,serif;font-size: 16px;margin-top:8px;">{{ event.days[0].description }}</div>`,
};

let eventMailTemplate = `<html>
<head></head>
<body>
<div style="font-family:Helvetica,Arial,serif;font-size: 16px;border-bottom:1px solid #CCC;">Upcoming Events</div>
{{#events}}
<hr style="margin-top:16px;margin-botton:16px;">
{{ . }}
{{/events}}
</body>
</html>`;

