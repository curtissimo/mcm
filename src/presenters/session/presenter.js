import rabbit from 'rabbit.js';
import member from '../../models/member';

function promisify(scope, method) {
  let args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  let fn = scope[method].bind.apply(scope[method], args);
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err) {
        return bad(err);
      }
      try {
        good(value);
      } catch (e) {
        bad(e);
      }
    });
  })
}

function getMailbox(maildrop) {
  let context = rabbit.createContext(maildrop);
  let pusher = null;

  let promise = new Promise((good, bad) => {
    context.on('ready', function () {
      good(context);
    })
  });

  return promise
    .then(() => {
      pusher = context.socket('PUSH', { persistent: true });
      return promisify(pusher, 'connect', 'mcm-single-mail');
    })
    .then(() => {
      return {
        post(mail) { pusher.write(JSON.stringify(mail)); }
      };
    });
}

let presenter = {
  delete(ac) {
    ac.clearCookie(ac.account.subdomain);
    ac.redirect('/');
  },

  get(ac) {
    if (ac.member) {
      return ac.redirect('/chapter');
    }
    let data = {
      title: 'Log in',
      bad: ac.query.bad !== undefined,
      expiredMembership: ac.query.expiredMembership !== undefined
    };
    ac.addStylesheet('area');
    ac.render({ data: data, presenters: { menu: 'menu' } });
  },

  put(ac) {
    member.from(ac.chapterdb).byLogin(ac.body.email, function (e, m) {
      if (e || m.length !== 1) {
        return ac.redirect('/session?bad');
      }
      m = m[0];
      let now = new Date();
      if (now > m.membership.national.endDate || now > m.membership.local.endDate) {
        return ac.redirect('/session?expiredMembership');
      }
      let options = { httpOnly: true };
      if (ac.body.remember) {
        options.expires = new Date(Date.now() + 900000000000);
      }
      ac.cookie(ac.account.subdomain, m._id, options);
      ac.redirect('/chapter');
    });
  },

  help(ac) {
    member.from(ac.chapterdb).byHogNumber(ac.body.hogNumber, (e, entity) => {
      if (e) {
        return ac.error(e);
      }
      if (entity.length === 0) {
        return ac.render({
          data: { title: 'Sending a helpful email to you...' },
          presenters: { menu: 'menu' }
        });
      }
      entity = entity[0];
      getMailbox(ac.maildrop)
        .then(mailbox => {
          mailbox.post({
            to: `${entity.firstName} ${entity.lastName} <${entity.email}>`,
            from: 'Password Reminder <no-reply@republichog.org>',
            subject: `Your password from ${ac.settings.name}`,
            text: `Hello, ${entity.firstName}. \n\nSomeone recently requested your password. If you didn\'t, then you can ignore this email. \n\nIf you did, then your password is:\n\n\t${entity.password} \n\nKeep the shiny side up!`,
            html: `<p>Hello, ${entity.firstName}.</p><p>Someone recently requested your password. If you didn\'t, then you can ignore this email.</p><p>If you did, then your password is:</p><blockquote><b>${entity.password}</b></blockquote><p>Keep the shiny side up!</p>`
          });
        })
        .then(() => {
          ac.render({
            data: { title: 'Sending a helpful email to you...' },
            presenters: { menu: 'menu' }
          });
        })
        .catch(e => ac.error(e));
    });
  }
};

export default presenter;
