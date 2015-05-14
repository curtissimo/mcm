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
    if (!ac.member.permissions.canManageLoh) {
      ac.redirect('/chapter/dashboard');
    }

    member.projections.onlyFemaleMembers.projection(ac.chapterdb, (e, entities) => {
      if (e) {
        return ac.error(e);
      }
      var loh = [];
      var notLoh = [];
      for (let entity of entities) {
        let a = notLoh;
        if (entity.isLoh) {
          a = loh;
        }
        a.push(entity);
      }
      ac.render({
        data: {
          loh: loh,
          notLoh: notLoh,
          title: 'Manage LOH'
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageLoh) {
      return ac.redirect('/chapter/dashboard');
    }

    member.from(ac.chapterdb).get(ac.body.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      entity.isLoh = true;
      entity.to(ac.chapterdb).save(saveError => {
        if (saveError) {
          return ac.error(saveError);
        }

        ac.redirect('/chapter/loh');
      })
    });
  },

  delete(ac) {
    if (!ac.member.permissions.canManageLoh) {
      return ac.redirect('/chapter/dashboard');
    }
    
    if (ac.body.members === undefined) {
      return ac.redirect('/chapter/loh');
    }

    let promises = [];
    let from = member.from(ac.chapterdb);
    for (let id in ac.body.members) {
      promises.push(couchPromise(from, 'get', id));
    }
    Promise.all(promises)
      .then(entities => {
        let morePromises = [];
        for (let entity of entities) {
          entity.isLoh = false;
          morePromises.push(couchPromise(entity.to(ac.chapterdb), 'save'));
        }
        return Promise.all(morePromises);
      })
      .then(() => ac.redirect('/chapter/loh'))
      .catch(e => ac.error(e));
  }
};

export default presenter;
