/*jslint node: true*/
var stork;

stork = require('stork-odm');

module.exports = stork.deliver('chapter', function () {
  'use strict';
  this.string('name', { required: true });
  this.array('domains');

  this.string('city', { required: true });
  this.string('state', { required: true });

  this.number('chapterNumber', { required: true });
  this.string('sponsorUrl', { format: 'url' });

  this.object('urls', function () {
    this.string('facebook', { format: 'url' });
    this.string('photos', { format: 'url' });
    this.string('twitter', { format: 'url' });
  });

  this.object('sections', function () {
    this.bool('dashboard');
    this.bool('discussions');
    this.bool('events');
    this.bool('members');
    this.bool('newsletters');
  });

  /*jslint nomen: true*/
  this.view('byUri', function (chapter, emitKey) {
    var i;
    emitKey(chapter._id);
    if (chapter.domains) {
      for (i = 0; i < chapter.domains.length; i += 1) {
        emitKey(chapter.domains[i]);
      }
    }
  });
  /*jslint nomen: true*/
});
