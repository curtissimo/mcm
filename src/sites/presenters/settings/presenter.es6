import settings from '../../../models/settings';

let presenter = {
  list(ac) {
    if (!ac.member.permissions.canManageSettings) {
      return ac.redirect('/chapter/dashboard');
    }

    settings.from(ac.chapterdb).all((e, s) => {
      if (e) {
        return ac.error(e);
      }

      s = s[0];
      ac.render({
        data: {
          settings: s,
          title: 'Chapter Settings'
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      })
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageSettings) {
      return ac.redirect('/chapter/dashboard');
    }

    settings.from(ac.chapterdb).all((e, s) => {
      if (e) {
        return ac.error(e);
      }
      s = s[0];
      Object.assign(s, ac.body);
      s.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }
        ac.settings.name = s.name;
        ac.settings.rideLegalese = s.rideLegalese;
        ac.redirect('/chapter/settings');
      });
    });
  }
};

export default presenter;
