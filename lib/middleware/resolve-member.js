/*jslint node: true*/
var member, sessionIds, expmap, liburl;

expmap = require('express-map');
liburl = require('url');
member = require('../models/member');

module.exports = function (enforced) {
  'use strict';
  return function (req, res, next) {
    var chapterdb, token, pathTo, url;

    pathTo = expmap.pathTo(req.app.getRouteMap());
    token = req.cookies.sessionId || '';

    if (!token && enforced) {
      url = {
        pathname: pathTo('login'),
        search: 'return=' + encodeURIComponent(req.url)
      };
      return res.redirect(liburl.format(url));
    }

    chapterdb = req.chapterdb;

    member.from(chapterdb).byToken(token, function (e, users) {
      var u = users[0];
      if (e) {
        next(e);
      }
      if (!u && enforced) {
        return res.redirect(pathTo('login'));
      }
      if (u) {
        req.member = u;
      }
      next();
    });
  };
};
