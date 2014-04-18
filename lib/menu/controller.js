/*jslint node: true*/
var pages;

pages = require('../models/page');

module.exports = {
  get: function (scene) {
    'use strict';
    pages.from(scene.chapterdb).all(function (e, pages) {
      if (e) {
        return scene.cut(e);
      }

      if (scene.member) {
        pages.push({
          path: scene.pathTo('dashboard'),
          title: 'Go to your activity dashboard',
          menuName: 'Members-Only'
        });
        pages.push({
          path: scene.pathTo('login'),
          title: 'Sign out of the chapter Web site',
          menuName: 'Sign out',
          method: 'delete'
        });
      } else {
        pages.push({
          path: scene.pathTo('login'),
          title: 'Log into the chapter Web site',
          menuName: 'Sign in'
        });
      }

      pages.forEach(function (page) {
        if (page.path === scene.url.pathname) {
          page.isActive = true;
        }
      });
      scene.stage({
        pages: pages
      });
    });
  }
};
