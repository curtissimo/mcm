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
