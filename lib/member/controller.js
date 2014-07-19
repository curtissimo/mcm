/*jslint node: true*/
var member = require('../models/member');

function getMany(scene) {
  'use strict';
  member.from(scene.chapterdb).all(function (e, members) {
    var data, controllers;

    if (e) {
      return scene.cut(e);
    }

    members.forEach(function (m) {
      /*jslint nomen: true*/
      if (m.photo) {
        m.photoPath = scene.pathTo('private-attachment', { id: m._id, name: 'photo' });
      }
      m.memberUrl = scene.pathTo('member', { id: m._id });
      /*jslint nomen: false*/

      if (m.phones && m.phones.mobile) {
        m.phone = 'mobile: ' + m.phones.mobile;
      } else if (m.phones && m.phones.home) {
        m.phone = 'home: ' + m.phones.home;
      }

      if (scene.member && scene.member.privileges && scene.member.privileges.canModifyMembers) {
        return;
      }
      if (!(m.preferences && m.preferences.directory && m.preferences.directory.email)) {
        m.email = false;
      }
      if (!(m.preferences && m.preferences.directory && m.preferences.directory.phone)) {
        m.phone = false;
      }
    });

    members = members.filter(function (member) {
      return (member.preferences && member.preferences.directory)
          || (scene.member && scene.member.privileges && scene.member.privileges.canModifyMembers);
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
  var controllers, data;

  controllers = {
    menu: 'member-menu',
    footer: 'footer'
  };

  member.from(scene.chapterdb).get(scene.param('id'), function (e, m) {
    var modifier = scene.member.privileges && scene.member.privileges.canModifyMembers;
    if (e) {
      scene.cut(e);
    }

    /*jslint nomen: true*/
    if (!(m.preferences && m.preferences.directory) && !modifier && scene.member._id !== m._id) {
      return scene.block(scene.pathTo('members'));
    }

    if (m.photo) {
      m.photoPath = scene.pathTo('private-attachment', { id: m._id, name: 'photo' });
    }
    /*jslint nomen: false*/

    data = {
      title: 'Some members info',
      unknownMemberPath: '/themes/' + scene.chapter.theme + '/unknown-user.png',
      m: m,
      user: scene.member
    };

    scene.stage('one', data, controllers);
  });
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
