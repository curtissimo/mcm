/*jslint node: true, nomen: true*/
module.exports = {
  get: function (scene) {
    'use strict';
    var data, controllers;

    data = {
      chapter: scene.chapter,
      title: 'I love this',
      text: 'I am on pages.',
      error: 'no error, man'
    };
    controllers = {
      footer: 'footer',
      header: 'header',
      menu: 'menu'
    };

    scene.stage(data, controllers);
  }
};
