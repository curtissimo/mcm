import member from '../../../models/member';

let permissions = {
  'Chapter docs': 'canManagePrivateDocuments',
  'Discussions': 'canManageDiscussions',
  'Events': 'canManageEvents',
  'Members': 'canManageMembers',
  'Newsletters': 'canManageNewsletters',
  'Public docs': 'canManagePublicDocuments',
  'Security': 'canManagePermissions',
  'Settings': 'canManageSettings',
  'Road Captains': 'canManageRoadCaptains',
  'Emails': 'canManageEmails'
};

function promisify(fn) {
  return new Promise((good, bad) => {
    fn((err, value) => {
      if (err) {
        return bad(err);
      }
      good(value);
    });
  })
}

let presenter = {
  list(ac) {
    if (!ac.member.permissions.canManagePermissions) {
      return ac.redirect('/chapter/dashboard');
    }

    member.from(ac.chapterdb).all((e, members) => {
      if (e) {
        return ac.error(e);
      }
      for (let m of members) {
        m.permissions = m.permissions || {};
      }
      ac.render({
        data: {
          title: 'Chapter Security Settings',
          permissions: permissions,
          members: members
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManagePermissions) {
      return ac.redirect('/chapter/dashboard');
    }

    member.from(ac.chapterdb).all((e, members) => {
      if (e) {
        return ac.error(e);
      }


      let promises = [];
      for (let m of members) {
        m.permissions = {};
        if (ac.body.members[m._id]) {
          for (let key of Object.keys(ac.body.members[m._id].permissions)) {
            let value = ac.body.members[m._id].permissions;
            m.permissions[key] = !!value;
          }
        }
        let to = m.to(ac.chapterdb);
        promises.push(promisify(to.save.bind(to)));
      }
      Promise.all(promises)
        .then(() => {
          ac.redirect('/chapter/security');
        })
        .catch(e => {
          ac.error(e);
        });
    });
  }
};

export default presenter;
