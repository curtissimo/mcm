import moment from 'moment';
import member from '../../../models/member';
import email from '../../../models/email';
import { text2html, html2text, randomValueHex, getDomain, postMailDirective } from '../../../mailUtils';

let distributionLists = [];

for (let key of Object.keys(member.projections)) {
  distributionLists.push({
    id: key,
    name: member.projections[key].name
  });
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
          if (missive.group && member.projections[missive.group.view]) {
            missive.secondColumnValue = member.projections[missive.group.view].title;
          } else {
            missive.secondColumnValue = missive.for.replace(/</g, '&lt;').replace(/"/g, '');
          }
        } else {
          missive.secondColumnValue = missive.from.replace(/</g, '&lt;').replace(/"/g, '');
        }
        missive.received = moment(missive.received).format('MM/DD/YYYY HH:MM A');
        if (!missive.text && missive.html) {
          missive.text = html2text(missive.html);
        } else if (!missive.text) {
          missive.text = '';
        }
        missive.text = missive.text.replace(/</g, '&lt;').replace(/\n/g, '<br>');
        if (missive.text.length > 50) {
          let firstSpace = missive.text.substring(49).indexOf(' ');
          if (firstSpace > -1) {
            missive.text = missive.text.substring(0, 49 + firstSpace) + '...';
          }
        }
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
          headerPrefix: headerPrefix,
          error: ac.query.error
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
        // 'Reply All': `/chapter/emails/${ac.params.id}/reply-all-form`,
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
        if (missive.group && member.projections[missive.group.view]) {
          missive.recipients = member.projections[missive.group.view].title;
        } else {
          missive.recipients = missive.for.replace(/</g, '&lt;').replace(/"/g, '');
        }
        missive.recipients = [{ name: missive.recipients }];
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
        missive.text = missive.text.replace(/</g, '&lt;').replace(/\n/g, '<br>');
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

  replyForm(ac) {
    email.from(ac.chapterdb).get(ac.params.id, (e, entity) => {
      let fromName = entity.from
        .replace(/</, '&amp;lt;')
        .replace(/>/, '&amp;gt;');
      let sent = moment(entity.sent).format('MMM DD, YYYY');
      entity.newReferences = `${entity.references} ${entity.messageId}`.trim();
      entity.replyText = `\n\n> ${entity.text.replace(/\n/g, '\n> ')}`;
      entity.replyHtml = `<html>
        <head></head>
        <body>
          <br>
          <br>
          <blockquote>
            <div>On ${sent}, ${fromName} wrote:<br></div>
            <div><br></div>
            <div>${text2html(entity.text)}</div>
          </blockquote>
        </body>
      </html>`;
      ac.render({
        data: {
          email: entity
        },
        presenters: { menu: 'menu' },
        layout: 'chapter',
        view: 'reply'
      });
    });
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

  postGroup(ac) {
    ac.body.sent = new Date();
    ac.body.from = `"${ac.member.firstName} ${ac.member.lastName}" <${ac.member.officerInbox}@${getDomain(ac.account)}>`;
    ac.body.messageId = `<${randomValueHex(8)}.${randomValueHex(10)}@${getDomain(ac.account)}>`;
    ac.body.group = { view: ac.body.toList };

    let missive = email.new(ac.body);
    missive.to(ac.chapterdb).save((e, { _id }) => {
      let directive = {
        id: _id,
        subdomain: ac.account.subdomain
      };
      postMailDirective('mcm-group-mail', directive)
        .then(() => ac.redirect('/chapter/emails'))
        .catch(e => {
          if (e.code === 'ETIMEDOUT') {
            return ac.redirect('/chapter/emails?error=unavailable');
          }
          ac.error(e);
        });
    });
  },

  postReply(ac) {
    ac.body.sent = new Date();
    ac.body.from = `"${ac.member.firstName} ${ac.member.lastName}" <${ac.member.officerInbox}@${getDomain(ac.account)}>`;
    ac.body.messageId = `<${randomValueHex(8)}.${randomValueHex(10)}@${getDomain(ac.account)}>`;

    let missive = email.new(ac.body);
    missive.to(ac.chapterdb).save((e, { _id }) => {
      ac.body.to = ac.body.for;
      postMailDirective('mcm-single-mail', ac.body)
        .then(() => ac.redirect('/chapter/emails'))
        .catch(e => {
          if (e.code === 'ETIMEDOUT') {
            return ac.redirect('/chapter/emails?error=unavailable');
          }
          ac.error(e);
        });
    });
  },

  post(ac) {
    if (ac.member.officerInbox === undefined) {
      return ac.redirect('/chapter/dashboard');
    }

    if (ac.body.toList) {
      return this.postGroup(ac);
    }
    this.postReply(ac);
  }
};

export default presenter;
