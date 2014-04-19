/*jslint node: true*/
module.exports = {
  get: function (scene) {
    'use strict';
    var data, controllers;

    data = { title: 'View Discussions' };
    controllers = {
      menu: 'member-menu',
      footer: 'footer'
    };

    scene.stage(data, controllers);
  }
};
