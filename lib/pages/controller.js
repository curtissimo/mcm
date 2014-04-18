/*jslint node: true, nomen: true*/
var pages = require('../models/page');

module.exports = {
  get: function (scene) {
    'use strict';
    var data, controllers;

    pages.from(scene.chapterdb).byPath(scene.url.pathname, function (e, page) {
      var content;

      if (e || page.length === 0) {
        e = new Error('page not found at' + scene.url.pathname);
        e.statusCode = 404;
        return scene.cut(e);
      }
      page = page[0];
      content = [];

      page.parts.forEach(function (part) {
        content.push(part);
      });

      data = {
        title: page.title,
        content: content.join('\n')
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
