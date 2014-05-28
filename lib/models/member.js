/*jslint node: true*/
var stork;

stork = require('stork-odm');

module.exports = stork.deliver('member', function () {
  'use strict';
  this.string('email', { format: 'email', required: true });
  this.string('login');
  this.string('hogNumber', { required: true });
  this.string('password', { required: true });

  this.string('firstName');
  this.string('lastName');
  this.string('nickName');
  this.object('nationalMembership', function () {
    this.datetime('startedOn');
    this.datetime('expiresOn');
  });

  this.object('localMembership', function () {
    this.datetime('startedOn');
    this.datetime('expiresOn');
  });

  this.object('preferences', function () {
    this.bool('directory:show');
    this.bool('directory:show:email');
    this.bool('directory:show:address');
    this.bool('directory:show:phone');
  });

  this.object('phones', function () {
    this.string('home');
    this.string('mobile');
  });

  this.object('privileges', function () {
    this.bool('canModifyMembers');
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
});
