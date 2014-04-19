/*jslint node: true*/
module.exports = {
  get: function (scene) {
    'use strict';
    var actions, pages, me, sections;
    actions = [];
    pages = [];
    sections = scene.chapter.sections;
    /*jslint nomen: true*/
    me = scene.pathTo('member', { id: scene.member._id });
    /*jslint nomen: false*/

    if (sections.dashboard) {
      pages.push({
        path: scene.pathTo('dashboard'),
        title: 'Go to your activity dashboard',
        menuName: 'Dashboard'
      });
    }

    if (sections.discussions) {
      pages.push({
        path: scene.pathTo('discussions'),
        title: 'Read your chapter\'s discussions',
        menuName: 'Discussions'
      });
    }

    if (sections.events) {
      pages.push({
        path: scene.pathTo('events'),
        title: 'Check out what\'s going on with your chapter',
        menuName: 'Events'
      });
    }

    if (sections.members) {
      pages.push({
        path: scene.pathTo('members'),
        title: 'See what your fellow member\'s are doing',
        menuName: 'Members'
      });
    }

    if (sections.newsletters) {
      pages.push({
        path: scene.pathTo('newsletters'),
        title: 'Read your chapter\'s news',
        menuName: 'Newsletters'
      });
    }

    pages.push({
      path: '/',
      title: 'Back to the public site',
      menuName: 'Home'
    });

    actions.push({
      path: scene.pathTo('login'),
      title: 'Sign out of the chapter Web site',
      menuName: 'Sign out',
      method: 'delete'
    });

    pages.forEach(function (page) {
      if (page.path === scene.url.pathname) {
        page.isActive = true;
      }
    });

    scene.stage({
      me: me,
      pages: pages,
      actions: actions
    });
  }
};
