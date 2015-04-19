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
    if (!ac.member.permissions.canManageRoadCaptains) {
      ac.redirect('/chapter/dashboard');
    }

    member.from(ac.chapterdb).all((e, entities) => {
      if (e) {
        return ac.error(e);
      }
      var roadCaptains = [];
      var notRoadCaptains = [];
      for (let entity of entities) {
        let a = notRoadCaptains;
        if (entity.isRoadCaptain) {
          a = roadCaptains;
        }
        a.push(entity);
      }
      ac.render({
        data: {
          captains: roadCaptains,
          notCaptains: notRoadCaptains,
          title: 'Manage Road Captains'
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageRoadCaptains) {
      return ac.redirect('/chapter/dashboard');
    }

    member.from(ac.chapterdb).get(ac.body.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      entity.isRoadCaptain = true;
      entity.to(ac.chapterdb).save(saveError => {
        if (saveError) {
          return ac.error(saveError);
        }

        ac.redirect('/chapter/road-captains');
      })
    });
  },

  delete(ac) {
    if (!ac.member.permissions.canManageRoadCaptains) {
      return ac.redirect('/chapter/dashboard');
    }
    
    if (ac.body.members === undefined) {
      return ac.redirect('/chapter/road-captains');
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
          entity.isRoadCaptain = false;
          morePromises.push(couchPromise(entity.to(ac.chapterdb), 'save'));
        }
        return Promise.all(morePromises);
      })
      .then(() => ac.redirect('/chapter/road-captains'))
      .catch(e => ac.error(e));
  }
};

export default presenter;
