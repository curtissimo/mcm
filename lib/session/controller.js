/*jslint node: true*/
var controller, members;

members = require('../models/member');

controller = module.exports = {
  get: function (scene) {
    'use strict';
    var data, controllers;

    data = {
      chapter: scene.chapter,
      title: 'Sign into the member-only site'
    };
    controllers = {
      footer: 'footer',
      header: 'header',
      menu: 'menu'
    };

    scene.stage('get', data, controllers);
  },

  post: function (scene) {
    'use strict';
    members.from(scene.chapterdb).byLogin(scene.param('email'), function (e, member) {
      var cookieOptions = {
        httpOnly: true
      };

      if (e) {
        return scene.cut(e);
      }
      if (member.length === 0 || member.length >= 2) {
        return controller.get(scene);
      }
      member = member[0];
      if (member.password !== scene.param('password')) {
        return controller.get(scene);
      }

      if (scene.param('rememberMe')) {
        cookieOptions.expires = new Date(2020, 1, 1);
      }

      /*jslint nomen: true*/
      scene.cookie('sessionId', member._id, cookieOptions);
      /*jslint nomen: false*/

      scene.block(scene.pathTo('dashboard'));
    });
  },

  delete: function (scene) {
    'use strict';
    scene.clearCookie('sessionId');
    scene.block('/');
  }
};
