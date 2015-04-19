import moment from 'moment';
import discussion from '../../../models/discussion';
import commentEntity from '../../../models/comment';
import member from '../../../models/member';

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
    getMembers(ac, (e, membersMap) => {
      discussion.from(ac.chapterdb).withComments((e, discussions) => {
        if (e) {
          return ac.error(e);
        }
        let discussionMap = new Map();
        for (let d of discussions) {
          if (!discussionMap.has(d.category)) {
            discussionMap.set(d.category, []);
          }
          discussionMap.get(d.category).push(d);
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
        for (let d of discussions) {
          d.title = d.title || '«no title»';
          d.createdOn = moment(d.createdOn).format('ddd MM/DD/YYYY h:mm a');
          d.author = membersMap.get(d.authorId);
          if (d.comments.length > 0) {
            for (let comment of d.comments) {
              comment.author = membersMap.get(comment.authorId);
              comment.createdOn = moment(comment.createdOn).format('ddd MM/DD/YYYY h:mm a');
            }
            d.lastComment = d.comments[d.comments.length - 1];
          }
        }
        ac.render({
          data: {
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
        d.createdOn = moment(d.createdOn).format('ddd MM/DD/YYYY h:mm a');
        d.author = membersMap.get(d.authorId);
        if (d.comments.length > 0) {
          for (let comment of d.comments) {
            comment.author = membersMap.get(comment.authorId);
            comment.createdOn = moment(comment.createdOn).format('ddd MM/DD/YYYY h:mm a');
          }
        }
        let actions = {};
        if (ac.member.permissions.canManageDiscussions) {
          actions['Delete this discussion'] = `/chapter/discussions/${d._id}/delete-form`;
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
          return ac.redirect('/chapter/discussions');
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
        ac.redirect(`/chapter/discussions/${ac.params.id}`);
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
        ac.redirect('/chapter/discussions');
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
