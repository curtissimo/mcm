/*jslint node: true*/
var stork;

stork = require('stork-odm');

module.exports = stork.deliver('member', function () {
  'use strict';
  this.string('email', { format: 'email', required: true });
  this.string('token', { required: true });

  this.string('login');
  this.string('hogNumber', { required: true });
  this.string('password', { required: true });

  this.string('firstName');
  this.string('lastName');
  this.string('nickName');
  this.object('nationalMembership', function () {
    this.datetime('startedOn');
    this.datetime('expiresOn', { nullable: true });
  });

  this.object('localMembership', function () {
    this.datetime('startedOn');
    this.datetime('expiresOn');
  });

  this.object('preferences', function () {
    this.object('directory', function () {
      this.bool('email');
      this.bool('address');
      this.bool('phone');
    });
  });

  this.object('phones', function () {
    this.string('home');
    this.string('mobile');
  });

  this.object('privileges', function () {
    this.bool('canModifyMembers');
  });

  this.object('address', function () {
    this.string('street');
    this.string('apartment');
    this.string('city');
    this.string('state');
    this.string('zip');
  });

  this.binary('photo');

  this.sort('lastName', 'firstName');

  this.view('byLogin', function (member, emitKey) {
    if (member.email) {
      emitKey(member.email);
    }
    if (member.hogNumber) {
      emitKey(member.hogNumber);
    }
    if (member.login) {
      emitKey(member.login);
    }
  });

  this.view('byToken', function (member, emitKey) {
    if (member.token) {
      emitKey(member.token);
    }
  });
});
