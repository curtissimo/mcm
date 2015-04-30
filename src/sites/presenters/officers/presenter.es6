import member from '../../../models/member';

function couchPromise(scope, method) {
  let args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  let fn = scope[method].bind.apply(scope[method], args);
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err && err.status_code !== 404) {
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

let presenter = {
  list(ac) {
    if (!ac.member.permissions.canManageOfficers) {
      ac.redirect('/chapter/dashboard');
    }

    member.from(ac.chapterdb).all((e, entities) => {
      if (e) {
        return ac.error(e);
      }
      let titles = [];
      for (let entity of entities) {
        if (entity.title) {
          titles.push(entity.title);
        }
      }
      titles.sort();
      ac.render({
        data: {
          members: entities,
          titles: titles,
          title: 'Manage Officers'
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    });
  },

  put(ac) {
    if (!ac.member.permissions.canManageOfficers) {
      return ac.redirect('/chapter/dashboard');
    }

    let officers = ac.body.officers;
    for (let title of Object.keys(officers)) {
      officers[officers[title]] = title;
    }

    member.from(ac.chapterdb).all((e, entities) => {
      if (e) {
        return ac.error(e);
      }

      let promises =[];
      for (let entity of entities) {
        if (entity.title !== officers[entity._id]) {
          entity.title = officers[entity._id]
          promises.push(couchPromise(entity.to(ac.chapterdb), 'save'));
        }
      }

      Promise.all(promises)
        .then(() => ac.redirect('/chapter/officers'))
        .catch(e => ac.error(e))
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageOfficers) {
      return ac.redirect('/chapter/dashboard');
    }

    couchPromise(member.from(ac.chapterdb), 'get', ac.body.member)
      .then(m => {
        m.title = ac.body.title;
        m.officerInbox = ac.body.officerInbox.replace(/[^A-Z0-9]/gi, '').toLowerCase();
        return couchPromise(m.to(ac.chapterdb), 'save');
      })
      .then(() => ac.redirect('/chapter/officers'))
      .catch(e => ac.error(e));
  }
};

export default presenter;
