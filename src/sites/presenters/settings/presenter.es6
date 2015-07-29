import fs from 'fs';
import settings from '../../../models/settings';
import member from '../../../models/member';

let inProduction = process.env.NODE_ENV === 'production';
let dest = inProduction ? process.cwd() + '/../../files' : process.cwd() + '/build/sites/files';

let presenter = {
  list(ac) {
    if (!ac.member.permissions.canManageSettings) {
      return ac.redirect('/chapter/dashboard');
    }

    settings.from(ac.chapterdb).all((e, s) => {
      if (e) {
        return ac.error(e);
      }
      member.from(ac.chapterdb).onlyOfficers((e, officers) => {
        if (e) {
          return ac.error(e);
        }

        s = s[0];
        let titles = officers.map(o => o.title);
        titles.unshift('');
        ac.render({
          data: {
            settings: s,
            title: 'Chapter Settings',
            titles: titles
          },
          layout: 'chapter',
          presenters: { menu: 'menu' }
        });
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageSettings) {
      return ac.redirect('/chapter/dashboard');
    }

    if (!Array.isArray(ac.files.chapterPhoto)) {
      if (ac.files.chapterPhoto) {
        ac.files.chapterPhoto = [ ac.files.chapterPhoto ];
      } else {
        ac.files.chapterPhoto = [];
      }
    }

    settings.from(ac.chapterdb).all((e, s) => {
      if (e) {
        return ac.error(e);
      }
      ac.body.photoUrl = ac.body.photoUrl || '';
      ac.body.sponsor.url = ac.body.sponsor.url.replace(/^https?:\/\//, '');

      s = s[0];
      s.photoUrl = ac.body.photoUrl.trim();
      s.rideLegalese = ac.body.rideLegalese;
      s.name = ac.body.name;
      s.sponsor = ac.body.sponsor;
      s.description = ac.body.description.replace(/<div><br><\/div>/g, '');
      s.ombudsman = ac.body.ombudsman;
      s.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }
        ac.settings.name = s.name;
        ac.settings.rideLegalese = s.rideLegalese;
        ac.settings.description = s.description;
        ac.settings.photoUrl = s.photoUrl;
        ac.settings.sponsor = s.sponsor;
        ac.settings.ombudsman = s.ombudsman;

        if (ac.files.chapterPhoto.length > 0) {
          let file = ac.files.chapterPhoto[0];
          let newDir = dest + '/' + ac.account.subdomain;
          let newPath = dest + '/' + ac.account.subdomain + '/' + file.name;
          fs.mkdir(newDir, () => {
            fs.rename(file.path, newPath, () => {
              settings.from(ac.chapterdb).all((e, s) => {
                if (e) {
                  return ac.error(e);
                }
                s = s[0];
                s.photo = file.name;
                s.to(ac.chapterdb).save(e => {
                  if (e) {
                    return ac.error(e);
                  }
                  ac.settings.photo = file.name;
                  ac.redirect('/chapter/settings');
                });
              });
            });
          });
        } else {
          ac.redirect('/chapter/settings');
        }
      });
    });
  }
};

export default presenter;
