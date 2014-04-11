/*jslint node: true*/
var stork;

stork = require('stork-odm');

module.exports = stork.deliver('page', function () {
  'use strict';
  this.string('title', { required: true });
  this.string('menuName', { required: true });
  this.string('path', { required: true });
  this.array('parts');

  this.view('byPath', function (page, emitKey) {
    if (page.path) {
      emitKey(page.path);
    }
  });
});
