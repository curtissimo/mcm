import 'babel-core/polyfill';
import nano from 'nano';
import url from 'url';
import nodemailer from 'nodemailer';
import rabbit from 'rabbit.js';
import schedule from 'node-schedule';

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
  if (!accountdbs.has(subdomain) === undefined) {
    accountdbs.set(subdomain, nano(url.resolve(dburl, subdomain)));
  }
  return accountdbs.get(subdomain);
}

function fetchMail({ subdomain, id }) {
  let db = getAccountDb(subdomain);
  return promisify(db, 'get', id);
}

function populateRecipients(email) {
  let db = getAccountDb(subdomain);
  let options = { include_docs: true };
  return promisify(db, 'view', 'member', email.group.view, options)
    .then(members => {
      let promises = [];
      for (let [ order, member ] of members.entries()) {
        let recipient = {
          to: `${member.firstName} ${member.lastName} <${member.email}>`,
          $email_recipients_id: email._id,
          $email_recipients_order: order,
          kind: 'recipient'
        };
        promises.push(mergeCouchInsert(db, recipient));
      }
      return Promise.all(promises)
    })
    .then(recipients => {
      return {
        email: email,
        recipients: recipients,
        db: db
      };
    });
}

function mailAndMark({ email, recipients, db }) {
  let promises = [];
  for (let recipient of recipients) {
    let missive = {
      from: email.from,
      to: recipient.to,
      subject: email.subject,
      text: email.text,
      html: email.html
    }
    let promise = promisify(transporter, 'sendMail', missive)
      .then(() => {
        recipient.sent = new Date().toISOString();
        return mergeCouchInsert(db, recipient);
      });
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

context.on('ready', () => {
  group = context.socket('WORKER', { persistent: true });
  group.setEncoding('utf8');
  group.connect('mcm-group-mail', () => {
    group.on('data', (directive) => {
      group.ack();
      directive = JSON.parse(directive);
      fetchMail(directive)
        .then(email => populateRecipients(email))
        .then(({ email, recipients, db }) => mailAndMark({ email, recipients, db }))
        .catch(e => console.error(e));
    });
  });

  single = context.socket('WORKER', { persistent: true });
  single.setEncoding('utf8');
  single.connect('mcm-single-mail', () => {
    single.on('data', (missive) => {
      single.ack();
      missive = JSON.parse(missive);
      promisify(transporter, 'sendMail', missive)
        .catch(e => console.error('transporter error:', e));
    });
  });
});

context.on('close', (...rest) => console.log('Closing context.', rest) || process.exit());
context.on('error', (...rest) => console.error('Context error', rest));

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
        promises.push(promisify(db, 'view', 'event', 'byDate', options));
      }
      return Promise.all(promises);
    })
    .then(resultsBySubdomain => {
      // Too tired to think. Let's do something smart, here, when I can
      // think better. ;P
    })
    .catch(e => console.error(e));
});
// END: SCHEDULED
/////////////////////////////////////////////////////////////////////////////
