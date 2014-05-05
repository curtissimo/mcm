/*jslint node: true*/
var member = require('../models/member');

module.exports = {
  get: function (scene) {
    'use strict';
    member.from(scene.chapterdb).all(function (e, members) {
      var data, controllers;

      if (e) {
        scene.cut(e);
      }

      members.forEach(function (m) {
        if (m.photo) {
          /*jslint nomen: true*/
          m.photoPath = scene.pathTo('private-attachment', { id: m._id, name: 'photo' });
          /*jslint nomen: false*/
        }
      });

      data = {
        title: 'Members of the Chapter',
        members: members,
        unknownMemberPath: '/themes/' + scene.chapter.theme + '/unknown-user.png'
      };
      controllers = {
        menu: 'member-menu',
        footer: 'footer'
      };

      scene.stage(data, controllers);
    });
  }
};
