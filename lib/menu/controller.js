/*jslint node: true*/
var pages;

pages = require('../models/page');

module.exports = {
  get: function (scene) {
    'use strict';
    var actions, loggedin;
    actions = [];

    if (scene.member) {
      loggedin = scene.pathTo('dashboard');
      actions.push({
        path: scene.pathTo('login'),
        title: 'Sign out of the chapter Web site',
        menuName: 'Sign out',
        method: 'delete'
      });
    } else if (scene.pathTo('login') !== scene.url.pathname) {
      actions.push({
        path: scene.pathTo('login'),
        title: 'Log into the chapter Web site',
        menuName: 'Sign in',
        primary: true
      });
    }

    pages.from(scene.chapterdb).all(function (e, pages) {
      if (e) {
        return scene.cut(e);
      }

      pages.forEach(function (page) {
        if (page.path === scene.url.pathname) {
          page.isActive = true;
        }
      });
      scene.stage({
        loggedin: loggedin,
        pages: pages,
        actions: actions
      });
    });
  }
};
