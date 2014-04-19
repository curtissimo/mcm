/*jslint node: true*/
module.exports = {
  get: function (scene) {
    'use strict';
    var actions, pages;
    actions = [];
    pages = [];

    pages.push({
      path: scene.pathTo('dashboard'),
      title: 'Go to your activity dashboard',
      menuName: 'Dashboard'
    });

    pages.push({
      path: scene.pathTo('discussions'),
      title: 'Read your chapter\'s discussions',
      menuName: 'Discussions'
    });

    pages.push({
      path: scene.pathTo('events'),
      title: 'Check out what\'s going on with your chapter',
      menuName: 'Events'
    });

    pages.push({
      path: scene.pathTo('members'),
      title: 'See what your fellow member\'s are doing',
      menuName: 'Members'
    });

    pages.push({
      path: scene.pathTo('newsletters'),
      title: 'Read your chapter\'s news',
      menuName: 'Newsletters'
    });

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
      pages: pages,
      actions: actions
    });
  }
};
