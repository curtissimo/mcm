/*jslint node: true*/
var chapter, url, masterdb, domainSuffixRe;

chapter = require('../models/chapter');
url = require('url');

module.exports = function (req, res, next) {
  'use strict';
  var config, domainSuffix, hostId;

  config = req.app.get('config');

  if (masterdb === undefined) {
    masterdb = url.resolve(config.db.server, config.db.master);
    req.app.set('masterdb', masterdb);
  }

  if (domainSuffixRe === undefined) {
    domainSuffix = config.domainSuffix.replace(/\./g, '\\.');
    domainSuffixRe = new RegExp(domainSuffix + "$");
  }

  hostId = req.host.replace(domainSuffixRe, '');

  chapter.from(masterdb).byUri(hostId, function (e, chapters) {
    var c;
    if (e) {
      return next(e);
    }
    if (chapters.length === 0) {
      return res.redirect(config.catalogUrl);
    }
    c = chapters[0];
    req.chapter = c;
    /*jslint nomen: true*/
    req.chapterdb = url.resolve(config.db.server, c._id);
    /*jslint nomen: false*/
    next();
  });
};
