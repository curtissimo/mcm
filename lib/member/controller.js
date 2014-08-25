/*jslint node: true*/
var directory, member;

member = require('../models/member');
directory = {
  init: function () {
    'use strict';
    this.listing = [{ initial: '', members: [] }];
  },
  addMember: function (member) {
    'use strict';
    var last, o;

    last = this.listing[this.listing.length - 1];

    if (last.initial !== member.lastName[0]) {
      o = {
        initial: member.lastName[0],
        members: []
      };
      this.listing.push(o);
      last = o;
    }

    last.members.push(member);
  },
  publish: function () {
    'use strict';
    return this.listing.slice(1);
  }
};

function getMany(scene) {
  'use strict';
  member.from(scene.chapterdb).all(function (e, members) {
    var d, data, controllers;

    if (e) {
      return scene.cut(e);
    }

    d = Object.create(directory);
    d.init();

    /*jslint nomen: true*/
    members = members.filter(function (member) {
      return (member.preferences && member.preferences.directory)
          || (scene.member && scene.member.privileges && scene.member.privileges.canModifyMembers)
          || (scene.member._id === member._id);
    });
    /*jslint nomen: false*/

    members.forEach(function (m) {
      d.addMember(m);

      /*jslint nomen: true*/
      if (m.photo) {
        m.photoPath = scene.pathTo('private-attachment', { id: m._id, name: 'photo' });
      }
      m.memberUrl = scene.pathTo('member', { id: m._id });
      /*jslint nomen: false*/

      m.since = m.localMembership.startedOn.getFullYear();

      if (m.phones && m.phones.mobile) {
        m.phone = m.phones.mobile;
      } else if (m.phones && m.phones.home) {
        m.phone = m.phones.home;
      }

      if (scene.member && scene.member.privileges && scene.member.privileges.canModifyMembers) {
        return;
      }

      if (!(m.preferences && m.preferences.directory && m.preferences.directory.email)) {
        m.email = false;
      }

      if (!(m.preferences && m.preferences.directory && m.preferences.directory.address)) {
        m.address = false;
      }

      if (!(m.preferences && m.preferences.directory && m.preferences.directory.phone)) {
        m.phone = false;
      }
    });

    data = {
      title: 'Members of the Chapter',
      directoryEntry: d.publish(),
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
    var modifier, showPrivates;
    if (e || !m) {
      return scene.block(scene.pathTo('members'));
    }

    modifier = scene.member.privileges && scene.member.privileges.canModifyMembers;

    /*jslint nomen: true*/
    showPrivates = modifier || scene.member._id === m._id;
    /*jslint nomen: false*/

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

    if (m.localMembership.expiresOn.getTime() < new Date().getTime()) {
      m.localMembership.expired = true;
    }

    if (m.nationalMembership.expiresOn && m.nationalMembership.expiresOn.getTime() < new Date().getTime()) {
      m.nationalMembership.expired = true;
    }

    data = {
      title: m.firstName + ' ' + m.lastName,
      unknownMemberPath: '/themes/' + scene.chapter.theme + '/unknown-user.png',
      m: m,
      user: scene.member,
      showPrivateInformation: showPrivates
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
