import rabbit from 'rabbit.js';
import moment from 'moment';
import discussion from '../../../models/discussion';
import commentEntity from '../../../models/comment';
import member from '../../../models/member';
import { postMailDirective } from '../../../mailUtils';

function discussionDateComparison(a, b) {
  if (a.createdOn.valueOf() < b.createdOn.valueOf()) {
    return 1;
  }
  if (a.createdOn.valueOf() > b.createdOn.valueOf()) {
    return -1;
  }
  return 0;
}

function getMembers(ac, cb) {
  member.from(ac.chapterdb).all((e, members) => {
    if (e) {
      return cb(e);
    }
    let membersMap = new Map();
    let get = membersMap.get.bind(membersMap);
    membersMap.get = function (key) {
      return get(key) || {
        firstName: 'Removed',
        lastName: 'User',
        nickName: '',
        _id: -1,
        private: false
      };
    };
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
    let archived = false;
    let lastMonth = moment().subtract(1, 'month');
    let nav = { 'View archived discussions': '/chapter/discussions?archived' };
    let shortnav = { 'Archived': '/chapter/discussions?archived' };
    if (ac.query.hasOwnProperty('archived')) {
      archived = true;
      nav = { 'View active discussions': '/chapter/discussions' };
      shortnav = { 'Active': '/chapter/discussions' };
    }
    getMembers(ac, (e, membersMap) => {
      discussion.from(ac.chapterdb).withComments((e, discussions) => {
        if (e) {
          return ac.error(e);
        }
        let discussionMap = new Map();
        for (let d of discussions) {
          if (d.archived === undefined) {
            d.archived = false;
          }
          d.title = d.title || '«no title»';
          d.writtenOn = moment(d.createdOn).format('ddd MM/DD/YYYY h:mm a');
          d.author = membersMap.get(d.authorId);
          if (d.comments.length > 0) {
            for (let comment of d.comments) {
              comment.author = membersMap.get(comment.authorId);
              comment.writtenOn = moment(comment.createdOn).format('ddd MM/DD/YYYY h:mm a');
            }
            d.lastComment = d.comments[d.comments.length - 1];
            if (moment(d.lastComment.createdOn).isBefore(lastMonth) && !d.sticky) {
              d.archived = true;
            }
          } else {
            if (moment(d.createdOn).isBefore(lastMonth) && !d.sticky) {
              d.archived = true;
            }
          }
          if (d.archived === archived) {
            if (!discussionMap.has(d.category)) {
              discussionMap.set(d.category, []);
            }
            discussionMap.get(d.category).push(d);
          }
        }
        for (let categorized of discussionMap.values()) {
          categorized.sort((a, b) => {
            if (a.sticky && b.sticky) {
              return discussionDateComparison(a, b);
            }
            if (a.sticky) {
              return -1;
            }
            if (b.sticky) {
              return 1;
            }
            return discussionDateComparison(a, b);
          });
        }
        let categories = Array.from(discussionMap.keys()).sort();
        ac.render({
          data: {
            nav: nav,
            shortnav: shortnav,
            title: 'Discussions',
            categories: categories,
            discussions: discussionMap,
            members: membersMap,
            actions: { 'Start a new discussion': '/chapter/discussions/create-form' }
          },
          layout: 'chapter',
          presenters: { menu: 'menu' }
        })
      });
    });
  },

  item(ac) {
    getMembers(ac, (e, membersMap) => {
      discussion.from(ac.chapterdb).withComments(ac.params.id, (e, d) => {
        if (e) {
          return ac.error(e);
        }
        if (!d) {
          return ac.notFound();
        }
        d.content = d.content.replace(/\n/g, '<br>');
        d.createdOn = moment(d.createdOn).format('ddd MM/DD/YYYY h:mm a');
        d.author = membersMap.get(d.authorId);
        if (d.comments.length > 0) {
          for (let comment of d.comments) {
            comment.author = membersMap.get(comment.authorId);
            comment.createdOn = moment(comment.createdOn).format('ddd MM/DD/YYYY h:mm a');
            comment.content = comment.content.replace(/\n/g, '<br>');
          }
        }
        let actions = {};
        if (ac.member.permissions.canManageDiscussions) {
          if (!d.archived) {
            actions['Archive'] = `/chapter/discussions/${d._id}/archive`;
          }
          if (d.sticky) {
            actions['Unstick'] = `/chapter/discussions/${d._id}/unstick`;
          } else {
            actions['Stick'] = `/chapter/discussions/${d._id}/stick`;
          }
          actions['Delete'] = `/chapter/discussions/${d._id}/delete-form`;
        }
        actions['Comment on this'] = 'javascript:showComments()';
        ac.render({
          data: {
            canManage: ac.member.permissions.canManageDiscussions,
            actions: actions,
            title: d.title,
            discussion: d,
            nav: { '<i class="fa fa-chevron-left"></i> Back to discussions': '/chapter/discussions' },
            shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/discussions' },
          },
          presenters: { menu: 'menu' },
          layout: 'chapter'
        });
      });
    });
  },

  deleteForm(ac) {
    if (!ac.member.permissions.canManageDiscussions) {
      ac.redirect('/chapter/discussions');
    }

    getMembers(ac, (e, membersMap) => {
      discussion.from(ac.chapterdb).withComments(ac.params.id, (e, d) => {
        if (e) {
          return ac.error(e);
        }
        d.createdOn = moment(d.createdOn).format('ddd MM/DD/YYYY h:mm a');
        d.author = membersMap.get(d.authorId);
        if (d.comments.length > 0) {
          for (let comment of d.comments) {
            comment.author = membersMap.get(comment.authorId);
            comment.createdOn = moment(comment.createdOn).format('ddd MM/DD/YYYY h:mm a');
          }
        }
        ac.render({
          data: {
            title: d.title,
            discussion: d,
            nav: { '<i class="fa fa-chevron-left"></i> Back to discussions': '/chapter/discussions' },
            shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/discussions' },
          },
          presenters: { menu: 'menu' },
          layout: 'chapter'
        });
      });
    });
  },

  archive(ac) {
    if (!ac.member.permissions.canManageDiscussions) {
      ac.redirect(`/chapter/discussions/${ac.params.id}`);
    }

    discussion.from(ac.chapterdb).withComments(ac.params.id, (e, d) => {
      d.archived = true;
      d.to(ac.chapterdb).save(saveErr => {
        ac.redirect(`/chapter/discussions/${ac.params.id}`);
      });
    });
  },

  stick(ac) {
    if (!ac.member.permissions.canManageDiscussions) {
      ac.redirect(`/chapter/discussions/${ac.params.id}`);
    }

    discussion.from(ac.chapterdb).withComments(ac.params.id, (e, d) => {
      d.sticky = true;
      d.to(ac.chapterdb).save(saveErr => {
        ac.redirect(`/chapter/discussions/${ac.params.id}`);
      });
    });
  },

  unstick(ac) {
    if (!ac.member.permissions.canManageDiscussions) {
      ac.redirect(`/chapter/discussions/${ac.params.id}`);
    }

    discussion.from(ac.chapterdb).withComments(ac.params.id, (e, d) => {
      d.sticky = false;
      d.to(ac.chapterdb).save(saveErr => {
        ac.redirect(`/chapter/discussions/${ac.params.id}`);
      });
    });
  },

  delete(ac) {
    if (!ac.member.permissions.canManageDiscussions) {
      ac.redirect('/chapter/discussions');
    }

    discussion.from(ac.chapterdb).withComments(ac.params.id, (e, d) => {
      if (e) {
        return ac.redirect('/chapter/discussions');
      }
      d.to(ac.chapterdb).destroy(e => {
        if (e) {
          return ac.error(e);
        }
        for (let c in d.comments) {
          if (c.to) {
            c.to(ac.chapterdb).destroy();
          }
        }
        ac.redirect('/chapter/discussions');
      });
    });
  },

  deleteComment(ac) {
    if (!ac.member.permissions.canManageDiscussions) {
      ac.redirect('/chapter/discussions');
    }
    let docId = ac.params.id;
    let comId = ac.params.commentId;

    commentEntity.from(ac.chapterdb).get(comId, (e, c) => {
      if (e) {
        return ac.redirect(`/chapter/discussions/${docId}`);
      }

      c.to(ac.chapterdb).destroy(e => {
        ac.redirect(`/chapter/discussions/${docId}`);
      });
    });
  },

  create(ac) {
    ac.render({
      data: {
        canManage: ac.member.permissions.canManageDiscussions,
        discussion: {},
        title: 'Start a new discussion'
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  createComment(ac) {
    let c = commentEntity.new(ac.body);
    c.authorId = ac.member._id;
    c['$discussion_comments_id'] = ac.params.id;
    c['$discussion_comments_order'] = ac.body['$discussion_comments_order'] - 0;

    let validation = c.validate();
    if (validation.valid) {
      c.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }
        let directive = {
          id: c._id,
          subdomain: ac.account.subdomain,
          domain: ac.account.domain
        };
        postMailDirective('mcm-discussion-mail', directive)
          .then(() => ac.redirect(`/chapter/discussions/${ac.params.id}`))
          .catch(e => ac.redirect(`/chapter/discussions/${ac.params.id}`));
      });
    } else {
      ac.redirect(`/chapter/discussions/${ac.params.id}`);
    }
  },

  post(ac) {
    ac.body.sticky = !!ac.body.sticky;
    let d = discussion.new(ac.body);
    d.authorId = ac.member._id;

    let validation = d.validate();
    if (validation.valid) {
      d.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }
        let directive = {
          id: d._id,
          subdomain: ac.account.subdomain,
          domain: ac.account.domain
        };
        postMailDirective('mcm-discussion-mail', directive)
          .then(() => ac.redirect('/chapter/discussions'))
          .catch(e => ac.redirect('/chapter/discussions'));
      });
    } else {
      let errors = {};
      (validation.errors || []).forEach(error => {
        errors[error.property] = error.message
      });
      let data = {
        canManage: ac.member.permissions.canManageDiscussions,
        title: 'Start a new discussion',
        errors: errors,
        discussion: {}
      };
      Object.assign(data.discussion, ac.body);
      ac.render({
        data: data,
        view: 'create',
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    }
  }
};

export default presenter;
