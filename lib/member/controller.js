/*jslint node: true*/
var member = require('../models/member');

function getMany(scene) {
  'use strict';
  member.from(scene.chapterdb).all(function (e, members) {
    var data, controllers;

    if (e) {
      scene.cut(e);
    }

    members.forEach(function (m) {
      /*jslint nomen: true*/
      if (m.photo) {
        m.photoPath = scene.pathTo('private-attachment', { id: m._id, name: 'photo' });
      }
      m.memberUrl = scene.pathTo('member', { id: m._id });
      /*jslint nomen: false*/
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

function getOne(scene) {
  'use strict';
  var controllers;

  controllers = {
    menu: 'member-menu',
    footer: 'footer'
  };

  scene.stage('one', { name: 'margaret' }, controllers);
}

module.exports = {
  get: function (scene) {
    'use strict';
    if (scene.param('id')) {
      getOne(scene);
    } else {
      getMany(scene);
    }
  }
};
