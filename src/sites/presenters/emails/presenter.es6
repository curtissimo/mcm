import rabbit from 'rabbit.js';
import crypto from 'crypto';
import moment from 'moment';
import member from '../../models/member';
import email from '../../models/email';

let distributionLists = [];

for (let key of Object.keys(member.projections)) {
  distributionLists.push({
    id: key,
    name: member.projections[key].name
  });
}

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

    let method = 'byInbox';
    let headerPrefix = 'Inbox';
    let secondColumnHeader = 'From';
    let nav = { 'View sent': '/chapter/emails?sent' };
    let shortnav = { 'Sent': '/chapter/emails?sent' };
    if (ac.query.hasOwnProperty('sent')) {
      method = 'bySentbox';
      headerPrefix = "Sent Email";
      nav = { 'View Inbox': '/chapter/emails' };
      shortnav = { 'Inbox': '/chapter/emails' };
      secondColumnHeader = 'To';
    }

    let inbox = ac.member.officerInbox.toLowerCase();
    let from = [ inbox, '' ];
    let to = [ inbox, '3' ];
    email.from(ac.chapterdb)[method](from, to, (fromError, emails) => {
      if (fromError) {
        return ac.error(fromError);
      }
      emails.reverse();
      for (let missive of emails) {
        if (ac.query.hasOwnProperty('sent')) {
          missive.secondColumnValue = member.projections[missive.group.view].title;
        } else {
          missive.secondColumnValue = missive.from.replace(/</g, '&lt;').replace(/"/g, '');
        }
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
      }
      ac.render({
        data: {
          actions: {
            'Write a new email': '/chapter/emails/create-form'
          },
          nav: nav,
          shortnav: shortnav,
          title: `Email for ${ac.member.officerInbox}`,
          inboxName: ac.member.officerInbox,
          secondColumnHeader: secondColumnHeader,
          emails: emails,
          headerPrefix: headerPrefix
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

  item(ac, isDelete) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }

    email.from(ac.chapterdb).get(ac.params.id, (e, missive) => {
      if (e) {
        return ac.error(e);
      }

      let actions = {
        'Delete': `/chapter/emails/${ac.params.id}/delete-form`,
        'Reply': `/chapter/emails/${ac.params.id}/reply-form`,
        'Reply All': `/chapter/emails/${ac.params.id}/reply-all-form`,
      };

      let lastSpace = missive.from.lastIndexOf(' ');
      if (lastSpace > -1) {
        missive.fromName = missive.from.substring(0, lastSpace);
        missive.fromEmail = missive.from.substring(lastSpace + 1);
      } else {
        missive.fromEmail = missive.from;
      }
      missive.fromEmail = missive.fromEmail.replace(/^</, '').replace(/>$/, '');
      if (missive.received) {
        missive.received = moment(missive.received).format('MMM D, YYYY H:mm A');
      } else {
        missive.recipients = [{ name: member.projections[missive.group.view].name }];
        actions = {
          'Delete': `/chapter/emails/${ac.params.id}/delete-form`
        };
      }
      missive.sent = moment(missive.sent).format('MMM D, YYYY H:mm A');

      if (!missive.text && missive.html) {
        missive.text = html2text(missive.html);
      } else if (!missive.text) {
        missive.text = '';
      } else {
        missive.text = missive.text.replace(/\n/g, '<br>');
      }

      ac.render({
        data: {
          email: missive,
          actions: actions,
          nav: { '<i class="fa fa-chevron-left"></i> Back to emails': '/chapter/emails' },
          shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/emails' },
          title: missive.subject,
          isDelete: isDelete
        },
        presenters: { menu: 'menu' },
        layout: 'chapter',
        view: 'item'
      });
    });
  },

  deleteForm(ac) {
    this.item(ac, true);
  },

  delete(ac) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }
    email.from(ac.chapterdb).get(ac.params.id, (e, missive) => {
      if (e) {
        return ac.error(e);
      }
      missive.to(ac.chapterdb).destroy(err => {
        if (err) {
          return ac.error(err);
        }
        if (missive.received) {
          ac.redirect('/chapter/emails');
        } else {
          ac.redirect('/chapter/emails?sent');
        }
      });
    });
  },

  post(ac) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }

    ac.body.sent = new Date();
    ac.body.from = `"${ac.member.firstName} ${ac.member.lastName}" <${ac.member.officerInbox}@${getDomain(ac.account)}>`;
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