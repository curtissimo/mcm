/*jslint node: true*/
var member, sessionIds, expmap;

member = require('../models/member');
expmap = require('express-map');

module.exports = function (enforced) {
  'use strict';
  return function (req, res, next) {
    var chapterdb, memberId, pathTo;

    pathTo = expmap.pathTo(req.app.getRouteMap());
    memberId = req.cookies.sessionId || '';

    if (!memberId && enforced) {
      return res.redirect(pathTo('login'));
    }

    chapterdb = req.app.get('chapterdb');

    member.from(chapterdb).get(memberId, function (e, u) {
      if (e && e.status_code === 404 && enforced) {
        return res.redirect(pathTo('login'));
      }
      if (u) {
        req.member = u;
      }
      next();
    });
  };
};
