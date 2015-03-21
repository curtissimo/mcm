let member = require('../../models/member');

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
  }
};

export default presenter;
