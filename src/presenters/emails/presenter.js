import rabbit from 'rabbit.js';
import crypto from 'crypto';
import moment from 'moment';
import email from '../../models/email';

let distributionLists = [
  { id: 'all', name: 'All members in good standing', project: 'activeOnly' },
  { id: 'all', name: 'All chapter members including the expried ones' },
  { id: 'all', name: 'Chapter members with expired local membership', project: 'localExpiredOnly' },
  { id: 'all', name: 'Chapter members with expired national membership', project: 'nationalExpiredOnly' },
  { id: 'all', name: 'Chapter members with expired membership of either kind', project: 'expiredOnly' },
  { id: 'onlyOfficers', name: 'Chapter officers' },
  { id: 'onlyRoadCaptains', name: 'Road Captains' },
];

function html2text(html) {
  return html.replace(/\n/g, ' ')
    .replace(/<br><\/h[1-6]>/g, '\n\n')
    .replace(/<\/h[1-6]>/g, '\n\n')
    .replace(/<br><\/[^>]+>/g, '</p>')
    .replace(/<br>/g, '\n')
    .replace(/<\/p>/g, '\n\n')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function randomValueHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2))
      .toString('hex')
      .slice(0, len);
}

function getDomain(account) {
  if (account.domain) {
    return account.domain;
  }
  return `${account.subdomain}.ismymc.com`;
}

let presenter = {
  list(ac) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }

    let inbox = ac.member.officerInbox.toLowerCase();
    let from = [ inbox, '' ];
    let to = [ inbox, '3' ];
    email.from(ac.chapterdb).byInbox(from, to, (fromError, emails) => {
      if (fromError) {
        return ac.error(fromError);
      }
      emails.reverse();
      for (let missive of emails) {
        missive.received = moment(missive.received).format('MM/DD/YYYY HH:MM A');
        if (!missive.text && missive.html) {
          missive.text = html2text(missive.html);
        } else if (!missive.text) {
          missive.text = '';
        }
        let firstLineBreak = missive.text.indexOf('\n');
        if (firstLineBreak > 50) {
          missive.text = missive.text.substring(0, firstLineBreak) + '...';
        }
        missive.text = missive.text.replace(/</g, '&lt;').replace(/\n/g, '<br>');
        let lastSpace = missive.from.lastIndexOf(' ');
        if (lastSpace > -1) {
          missive.from = missive.from.substring(0, lastSpace);
        }
        missive.from = missive.from.replace(/</g, '&lt;');
      }
      ac.render({
        data: {
          actions: {
            'Write a new email': '/chapter/emails/create-form'
          },
          title: `Email for ${ac.member.officerInbox}`,
          inboxName: ac.member.officerInbox,
          emails: emails
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  create(ac) {
    ac.render({
      data: {
        title: `Write a new email`,
        distributionLists: distributionLists
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  item(ac) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }

    email.from(ac.chapterdb).get(ac.params.id, (e, missive) => {
      if (e) {
        return ac.error(e);
      }

      let lastSpace = missive.from.lastIndexOf(' ');
      if (lastSpace > -1) {
        missive.fromName = missive.from.substring(0, lastSpace);
        missive.fromEmail = missive.from.substring(lastSpace + 1);
      } else {
        missive.fromEmail = missive.from;
      }
      missive.fromEmail = missive.fromEmail.replace(/^</, '').replace(/>$/, '');
      missive.received = moment(missive.received).format('MMM D, YYYY H:MM A');
      missive.sent = moment(missive.sent).format('MMM D, YYYY H:MM A');

      if (!missive.text && missive.html) {
        missive.text = html2text(missive.html);
      } else if (!missive.text) {
        missive.text = '';
      }

      ac.render({
        data: {
          email: missive,
          actions: {
            'Delete': `/chapter/emails/${ac.params.id}/delete-form`,
            'Reply': `/chapter/emails/${ac.params.id}/reply-form`,
            'Reply All': `/chapter/emails/${ac.params.id}/reply-all-form`,
          },
          nav: { '<i class="fa fa-chevron-left"></i> Back to emails': '/chapter/emails' },
          shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/emails' },
          title: missive.subject
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  post(ac) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }

    ac.body.sent = new Date();
    ac.body.from = `${ac.member.officerInbox}@${getDomain(ac.account)}`;
    ac.body.messageId = `<${randomValueHex(8)}.${randomValueHex(10)}@${getDomain(ac.account)}>`;
    ac.body.group = { view: ac.body.toList };

    let missive = email.new(ac.body);
    missive.to(ac.chapterdb).save((e, { _id }) => {
      let context = rabbit.createContext(process.env.MCM_RABBIT_URL);
      context.on('ready', () => {
        let socket = context.socket('PUSH', { persistent: true });
        socket.on('close', () => {
          context.close();
        });
        socket.connect('mcm-group-mail', () => {
          socket.end(JSON.stringify({
            id: _id,
            subdomain: ac.account.subdomain
          }));
          ac.redirect('/chapter/emails');
        });
      });
    });
  }
};

export default presenter;
