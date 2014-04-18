/*jslint node:true*/
var member, express, app, ycb, fs, chapter, Promise, context, config, environment, leslie, expmap, inflection, url;

express = require('express');
expmap = require('express-map');
ycb = require('ycb');
fs = require('fs');
environment = { environment: process.argv[2] || 'production' };
leslie = require('leslie-mvp');
inflection = require('inflection');
url = require('url');
chapter = require('./lib/middleware/resolve-chapter');
member = require('./lib/middleware/resolve-member');

function single(name, alias) {
  'use strict';
  var route = '/chapter/' + name;
  app.all(route, member(), leslie.bother(name));
  app.map(route, alias || name);
}

function many(name) {
  'use strict';
  var plural, route;
  plural = inflection.pluralize(name);
  route = '/chapter/' + plural;
  app.all(route, member(true), leslie.bother(name));
  app.map(route, plural);

  route += '/:id';
  app.all(route, member(true), leslie.bother(name));
  app.map(route, name);
}

fs.readFile('config.json', 'utf8', function (e, text) {
  'use strict';

  if (e) {
    return console.log(e);
  }

  config = new ycb.Ycb(JSON.parse(text)).read(environment);

  app = express();
  expmap.extend(app);
  app.set('config', config);

  app.use(express.bodyParser());
  app.use(express.static('assets'));
  app.use(express.cookieParser());
  app.use(chapter);

  app.get('/chapter', member(true), leslie.bother('dashboard'));
  app.map('/chapter', 'dashboard');

  single('dashboard');
  single('email');
  single('session', 'login');
  [ 'discussion', 'event', 'member', 'person', 'newsletter' ].forEach(function (name) {
    many(name);
  });

  app.all('/*', member(), leslie.bother('pages'));

  leslie.addMinion('pathTo', expmap.pathTo(app.getRouteMap()));
  leslie.setModifyScene(function (scene, req) {
    scene.pathTo = expmap.pathTo(app.getRouteMap());
    scene.member = req.member;
    scene.chapter = req.chapter;
    scene.chapterdb = req.chapterdb;
    scene.addViewData({ chapter: req.chapter });
    return scene;
  });

  app.listen(config.port);

  (function () {
    var page, chapter, member, masterdb, chapterdb;
    chapter = require('./lib/models/chapter');
    masterdb = url.resolve(config.db.server, config.db.master);
    chapter.to(masterdb).sync();

    member = require('./lib/models/member');
    chapterdb = url.resolve(config.db.server, 'republichog');
    member.to(chapterdb).sync();

    page = require('./lib/models/page');
    chapterdb = url.resolve(config.db.server, 'republichog');
    page.to(chapterdb).sync();
  }());
});
