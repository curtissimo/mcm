let member = require('../../models/member');

let presenter = {
  get(ac) {
    if (ac.member) {
      return ac.redirect('/chapter');
    }
    let data = {
      title: 'Log in',
      bad: ac.query.bad !== undefined
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
      ac.cookie(ac.account.subdomain, m._id);
      ac.redirect('/chapter');
    });
  }
};

export default presenter;
