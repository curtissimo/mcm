/*jslint node: true, nomen: true*/
var pages = require('../models/page');

module.exports = {
  get: function (scene) {
    'use strict';
    var data, controllers;

    pages.from(scene.chapterdb).byPath(scene.url.pathname, function (e, page) {
      if (e || page.length === 0) {
        e = new Error('page not found at' + scene.url.pathname);
        e.statusCode = 404;
        return scene.cut(e);
      }
      page = page[0];

      data = {
        chapter: scene.chapter,
        title: page.title,
        content: 'some content'
      };
      controllers = {
        footer: 'footer',
        header: 'header',
        menu: 'menu'
      };

      scene.stage(data, controllers);
    });
  }
};
