/*jslint node: true, todo: true*/
var stork;

stork = require('stork-odm');

module.exports = stork.deliver('page', function () {
  'use strict';
  this.string('title', { required: true });
  this.string('menuName', { required: true });
  this.string('path', { required: true });

  // TODO: Want a composition that allows for multiple types
  this.array('parts');

  this.view('byPath', function (page, emitKey) {
    if (page.path) {
      emitKey(page.path);
    }
  });
});
