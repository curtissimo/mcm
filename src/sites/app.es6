import 'babel/polyfill';
import express from 'express';
import path from 'path';
import { Directive, LeslieMvp } from './leslie';
import account from '../models/account';
import settings from '../models/settings';
import member from '../models/member';
import { Assets } from './assets';
import { inspect as ins } from 'util';
import { urlencoded, json } from 'body-parser';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import multer from 'multer';
import Ractive from 'ractive';

let app = express();
let inProduction = process.env.NODE_ENV === 'production';
let chapterdbs = new Map();
let dburl = process.env.MCM_DB;

Ractive.DEBUG = !inProduction;

if (!inProduction) {
  console.log('Serving public files from express at ' + __dirname);
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '365d'
  }));
}

app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(json());

app.use(function (req, res, next) {
  if (req.vars === undefined) {
    req.vars = {};
  }
  let server = req.get('x-forwarded-server') || req.hostname;
  req.vars.masterdb = dburl + '/mcm-master';

  if (chapterdbs.has(server)) {
    let { db, settings, account: a } = chapterdbs.get(server);
    req.vars.chapterdb = db;
    req.vars.settings = settings;
    req.vars.account = a;
    return next();
  }

  account.from(req.vars.masterdb).byUrl(server, function (e, a) {
    if (e && e.code === 'ECONNREFUSED') {
      return res.redirect('http://what.ismymc.com/under-maintenance');
    }
    if (e || a.length === 0) {
      return res.redirect('http://what.ismymc.com');
    }
    a = a[0];
    req.vars.account = a;
    req.vars.chapterdb = dburl + '/' + a.subdomain;
    settings.from(req.vars.chapterdb).all(function (e, s) {
      if (e) {
        next(e);
      }
      s = s[0];
      req.vars.settings = s;
      chapterdbs.set(server, {
         db: req.vars.chapterdb,
         settings: req.vars.settings,
         account: req.vars.account
      });
      next();
    });
  });
});

app.use((req, res, next) => {
  var id = req.cookies[req.vars.account.subdomain];
  if (id) {
    member.from(req.vars.chapterdb).get(id, function (e, m) {
      if (m) {
        if (!m.permissions) {
          m.permissions = {};
        }
        req.vars.member = m;
      }
      next();
    });
  } else {
    next();
  }
});

app.use('/chapter', (req, res, next) => {
  if (!req.vars.member) {
    return res.redirect('/session');
  }
  next();
});

app.get('/chapter', function (req, res, next) {
  res.redirect('/chapter/dashboard');
});

app.use('/chapter/newsletters', multer({
  limits: {
    files: 1,
    putSingleFilesInArray: true
  }
}));

app.use('/chapter/private-documents', multer({
  limits: {
    files: 1,
    putSingleFilesInArray: true
  }
}));

app.use('/chapter/public-documents', multer({
  limits: {
    files: 1,
    putSingleFilesInArray: true
  }
}));

app.use('/chapter/events', multer({
  limits: {
    putSingleFilesInArray: true
  }
}));

app.use('/chapter/members', multer({
  limits: {
    putSingleFilesInArray: true
  }
}));

app.use('/chapter/settings', multer({
  limits: {
    putSingleFilesInArray: true
  }
}));

app.use(methodOverride((req, res) => {
  if (req.body && req.body['X-HTTP-Method-Override']) {
    var method = req.body['X-HTTP-Method-Override'];
    delete req.body['X-HTTP-Method-Override'];
    return method;
  }
  if (req.query['X-HTTP-Method-Override']) {
    var method = req.query['X-HTTP-Method-Override'];
    return method;
  }
}));

let assets = new Assets();
assets.initialize()
  .then(() => {
    let leslie = new LeslieMvp(app, assets);
    leslie.contextModifier = (req, res, context) => {
      context.chapterdb = req.vars.chapterdb;
      context.maildrop = process.env.MCM_RABBIT_URL;
      context.settings = req.vars.settings;
      context.account = req.vars.account;
      context.member = req.vars.member;
      context.account = req.vars.account;
      context.body = req.body;
      context.files = req.files;
      context.query = req.query;
      context.params = req.params;
      context.path = req.path;
      context.referer = req.get('Referer');
      context.cookie = (name, value, options) => res.cookie(name, value, options);
      context.clearCookie = (name) => res.clearCookie(name);
    };
    leslie.data.set('ifltie9', '<!--[if lt IE 9]>');
      leslie.data.set('endif', '<![endif]-->');
    leslie.data.set('member', req => req.vars.member);

    leslie.addStylesheet('font-awesome');
    leslie.addStylesheet('app');
    leslie.addStylesheet('themes/leather/theme');
    leslie.addScript('ractive-legacy');
    leslie.addScript('moment');
    leslie.addScript('pikaday');
    leslie.addScript('app');

    leslie.get({ presenterName: 'dashboard', uri: '/chapter/dashboard' });

    leslie.routeTo({
      presenterName: 'session',
      routes: [
        { verb: 'get' },
        { verb: 'put' },
        { verb: 'put', action: 'help', method: 'help' },
        { verb: 'delete' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'road-captains',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'delete' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'loh',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'delete' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'polls',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'get', action: ':id/:option/:memberId', method: 'response' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: ':id/edit-form', method: 'edit' },
        { verb: 'get', action: ':id/delete-form', method: 'delete' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post' },
        { verb: 'patch', action: ':id' },
        { verb: 'delete', action: ':id', method: 'destroy' }
      ]
    })

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'officers',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'put' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'reports',
      routes: [
        { verb: 'get', action: 'mileage', method: 'mileage' },
        { verb: 'get', action: 'membership', method: 'membership' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'emails',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: ':id/delete-form', method: 'deleteForm' },
        { verb: 'get', action: ':id/reply-form', method: 'replyForm' },
        { verb: 'get', action: ':id/reply-all-form', method: 'replyAllForm' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'delete', action: ':id' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'newsletters',
      routes: [
        { verb: 'get' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: 'delete-form', method: 'deleteForm' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post' },
        { verb: 'delete' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'private-documents',
      routes: [
        { verb: 'get' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: 'delete-form', method: 'deleteForm' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post' },
        { verb: 'delete' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'public-documents',
      routes: [
        { verb: 'get' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: 'delete-form', method: 'deleteForm' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post' },
        { verb: 'delete' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'members',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: ':id/delete-form', method: 'delete' },
        { verb: 'get', action: ':id/edit-form', method: 'edit' },
        { verb: 'get', action: ':id/nophoto', method: 'nophoto' },
        { verb: 'get', action: ':id/photo', method: 'photo' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post', action: 'membership-dates', method: 'dates' },
        { verb: 'patch', action: ':id/photo', method: 'patchPhoto' },
        { verb: 'patch', action: ':id/privacy', method: 'patchPrivacy' },
        { verb: 'patch', action: ':id/mileage', method: 'patchMileage' },
        { verb: 'patch', action: ':id/emailPreferences', method: 'patchEmailPreferences' },
        { verb: 'put', action: ':id' },
        { verb: 'delete', action: ':id', method: 'destroy' },
        { verb: 'post', action: ':id/blogs', method: 'createBlog' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'discussions',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'get', action: ':id/stick', method: 'stick' },
        { verb: 'get', action: ':id/unstick', method: 'unstick' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: ':id/delete-form', method: 'deleteForm' },
        { verb: 'get', action: ':id/archive', method: 'archive' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post', action: ':id/comments', method: 'createComment' },
        { verb: 'post' },
        { verb: 'delete', action: ':id/comments/:commentId', method: 'deleteComment' },
        { verb: 'delete', action: ':id' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'events',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'get', action: 'create/:type', method: 'create' },
        { verb: 'get', action: ':id/edit-form', method: 'edit' },
        { verb: 'get', action: ':id/email', method: 'email' },
        { verb: 'get', action: ':id/delete-form', method: 'deleteForm' },
        { verb: 'get', action: ':id/cancel-form', method: 'cancelForm' },
        { verb: 'get', action: ':id/garmin/:index', method: 'garmin' },
        { verb: 'get', action: ':id/pdf/:index', method: 'pdf' },
        { verb: 'get', action: ':id/est/:index', method: 'est' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'patch', action: ':id', method: 'patch' },
        { verb: 'post' },
        { verb: 'put', action: ':id' },
        { verb: 'delete', action: ':id' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'achievements',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'get', action: 'create', method: 'create' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'security',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      area: 'chapter',
      presenterName: 'settings',
      routes: [
        { verb: 'get', method: 'list' },
        { verb: 'post' }
      ]
    });

    leslie.routeTo({
      presenterName: 'public-documents',
      routes: [
        { verb: 'get' }
      ]
    });

    leslie.routeTo({
      presenterName: 'home',
      routes: [
        { verb: 'get', action: 'photo', method: 'photo' },
        { verb: 'get'}
      ]
    });

    app.get('/images/:name', (req, res, next) => {
      let name = req.params.name;
      res.type(name.substring(name.lastIndexOf('.')));
      res.set('X-Accel-Redirect', '/mcm-files/' + name);
      res.set('Content-Disposition', 'inline');
      next();
    });

    app.get('/', (req, res) => {
      res.redirect('/home');
    });

    app.use((err, req, res, next) => {
      if (err instanceof Directive) {
        return res.status(err.code).end(err.content);
      }
      next(err);
    });

    if (!inProduction) {
      let dest = process.cwd() + '/build/sites/files';
      console.log('Serving uploaded files from express at ' + dest);
      app.use((req, res, next) => {
        if (res.get('X-Accel-Redirect')) {
          let path = res.get('X-Accel-Redirect').replace('/mcm-files', dest);
          res.set('X-Accel-Redirect', '');
          return res.sendFile(path, {
            headers: {
              'Content-Type': res.get('Content-Type'),
              'Content-Disposition': res.get('Content-Disposition')
            }
          });
        }
        next();
      });

      // Reload assets from gulp directive
      process.on('message', function (m) {
        if (m.reloadAssets) {
          assets.initialize()
            .then(() => {
              leslie.addStylesheet('font-awesome');
              leslie.addStylesheet('app');
              leslie.addStylesheet('themes/leather/theme');
              leslie.addScript('ractive-legacy');
              leslie.addScript('moment');
              leslie.addScript('pikaday');
              leslie.addScript('app');
              process.send({ assetsReloaded: true })
            });
        }
      });
    } else {
      app.use((req, res, next) => {
        if (res.get('X-Accel-Redirect')) {
          return res.end();
        }
        next();
      });
    }

    app.listen(3000);
  })
  .catch(e => console.log(`${e.message}\n${e.stack}`));
