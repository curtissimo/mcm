import moment from 'moment';
import { poll, response } from '../../../models/poll';
import member from '../../../models/member';
import { postMailDirective } from '../../../mailUtils';

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

function getMembers(ac, cb) {
  member.from(ac.chapterdb).all((e, members) => {
    if (e) {
      return cb(e);
    }
    let membersMap = new Map();
    for (let m of members) {
      membersMap.set(m._id, {
        firstName: m.firstName,
        lastName: m.lastName,
        nickName: m.nickName,
        _id: m._id,
        private: m.private
      });
    }
    cb(null, membersMap);
  });
}

let presenter = {
  list(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }

    getMembers(ac, (memberError, membersMap) => {
      poll.from(ac.chapterdb).withResponses((e, entities) => {
        if (e) {
          return ac.error(e);
        }
        for (let entity of entities) {
          entity.created = moment(entity.createdOn).format('MMM DD, YYYY');
          entity.updated = moment(entity.updatedOn).format('MMM DD, YYYY');
        }
        entities.sort(function (a, b) {
          if (a.createdOn.valueOf() > b.createdOn.valueOf()) {
            return -1;
          }
          if (a.createdOn.valueOf() < b.createdOn.valueOf()) {
            return 1;
          }
          return 0;
        });
        let polls = {
          open: [],
          closed: [],
          unopened: [],
          length: entities.length
        };
        for (let entity of entities) {
          if (entity.responses.length > 0) {
            for (let r of entity.responses) {
              if (r.option === 0) {
                let person = membersMap.get(r.respondantId);
                entity.firstRespondant = `${person.firstName} ${person.lastName}`;
                break;
              }
            }
          }
          if (entity.firstRespondant === undefined) {
            entity.firstRespondant = 'No responses, yet.';
          }
          if (entity.open === undefined) {
            polls.unopened.push(entity);
          } else if(entity.open === true) {
            polls.open.push(entity);
          } else {
            polls.closed.push(entity);
          }
        }
        ac.render({
          data: {
            polls: polls,
            actions: {
              'Create': '/chapter/polls/create-form'
            },
            title: 'Road Captain Polls'
          },
          layout: 'chapter',
          presenters: { menu: 'menu' }
        });
      });
    });
  },

  item(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }
    
    getMembers(ac, (memberError, membersMap) => {
      poll.from(ac.chapterdb).withResponses(ac.params.id, (e, entity) => {
        if (e) {
          return ac.error(e);
        }

        if (entity.responses.length > 0) {
          entity.responses.sort((a, b) => {
            if (a.createdOn.valueOf() < b.createdOn.valueOf()) {
              return -1;
            }
            if (a.createdOn.valueOf() > b.createdOn.valueOf()) {
              return 1;
            }
            return 0;
          });

          for (let r of entity.responses) {
            let created = moment(entity.createdOn);
            entity.respondant = membersMap.get(r.respondantId);
            entity.createdDate = created.format('YYYY-MM-DD');
            entity.createdTime = created.format('H:mm:ss a');
            if (!entity.options[r.option].count) {
              entity.options[r.option].count = 0;
            }
            entity.options[r.option].count += 1;
          }
        }

        ac.render({
          data: {
            poll: entity,
            title: entity.name,
            nav: { '<i class="fa fa-chevron-left"></i> Back to polls': '/chapter/polls' },
            shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/polls' },
            actions: {
              'Delete': `/chapter/polls/${entity._id}/delete-form`
            }
          },
          layout: 'chapter',
          presenters: { menu: 'menu' }
        });
      });
    });
  },

  create(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }
    
    ac.render({
      data: {
        title: 'Create a New Road Captain Poll'
      },
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  edit(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }
    
    ac.render({
      layout: 'chapter',
      presenters: { menu: 'menu' }
    });
  },

  response(ac) {
    poll.from(ac.chapterdb).withResponses(ac.params.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }
      entity.responses.push(response.new({
        respondantId: ac.params.memberId,
        option: parseInt(ac.params.option)
      }));
      entity.to(ac.chapterdb).save(err => {
        if (err) {
          return ac.error(err);
        }
        member.from(ac.chapterdb).get(ac.params.memberId, (error, ent) => {
          if (error) {
            return ac.error(error);
          }
          ac.render({
            data: {
              title: 'Response recorded.',
              member: ent,
              poll: entity
            },
            layout: 'chapter',
            presenters: { menu: 'menu' }
          });
        });
      });
    });
  },

  delete(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }
    
    poll.from(ac.chapterdb).get(ac.params.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      ac.render({
        data: {
          poll: entity,
          title: entity.name,
          nav: { '<i class="fa fa-chevron-left"></i> Back to polls': '/chapter/polls' },
          shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/polls' }
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }
    
    if (ac.body.open) {
      ac.body.open = true;
    }
    if (ac.body.options[2].name.trim().length === 0) {
      ac.body.options.splice(2, 1);
    }
    var entity = poll.new(ac.body);
    entity.to(ac.chapterdb).save(e => {
      if (e) {
        return ac.error(e);
      }
      if (entity.open) {
        return postMailDirective('mcm-poll-mail', {
          id: entity._id,
          subdomain: ac.account.subdomain,
          initiatorId: ac.member._id
        })
        .then(() => ac.redirect('/chapter/polls'))
        .catch(e => ac.error(e));
      }
      ac.redirect('/chapter/polls');
    });
  },

  patch(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }

    poll.from(ac.chapterdb).get(ac.params.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      let directive = ac.body.directive;
      if (directive.path === '/open') {
        entity.open = (directive.value === 'true');
      }

      entity.to(ac.chapterdb).save(saveError => {
        if (saveError) {
          return ac.error(e);
        }
        if (entity.open) {
          postMailDirective('mcm-poll-mail', {
            id: entity._id,
            subdomain: ac.account.subdomain
          });
        }
        ac.redirect('/chapter/polls');
      });
    });
  },

  destroy(ac) {
    if (!ac.member.permissions.canManagePolls) {
      return ac.redirect('/chapter/dashboard');
    }
    
    poll.from(ac.chapterdb).get(ac.params.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      let promises = [
        couchPromise(entity.to(ac.chapterdb), 'destroy')
      ];
      for (let r in entity.responses) {
        couchPromise(r.to(ac.chapterdb), 'destroy');
      }

      Promise.all(promises)
        .then(() => ac.redirect('/chapter/polls'))
        .catch(deleteErr => ac.error(deleteErr));
    });
  }
};

export default presenter;
