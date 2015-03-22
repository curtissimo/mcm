import 'babel-core/polyfill';
import express from 'express';
import path from 'path';
import Ractive from 'ractive';
import { LeslieMvp } from './leslie';
import account from './models/account';
import settings from './models/settings';
import member from './models/member';
import { Assets } from './assets';
import { inspect as ins } from 'util';
import { urlencoded, json } from 'body-parser';
import cookieParser from 'cookie-parser';
import methodOverride from 'method-override';
import multer from 'multer';

let app = express();
let inProduction = process.env.NODE_ENV === 'production';
let chapterdbs = new Map();

if (!inProduction) {
  console.log('Serving public files from express at ' + __dirname);
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '365d'
  }));
}

app.use(cookieParser());
app.use(urlencoded({ extended: true }));
app.use(json());

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

app.use(function (req, res, next) {
  if (req.vars === undefined) {
    req.vars = {};
  }
  let server = req.get('x-forwarded-server') || req.hostname;
  req.vars.masterdb = 'http://couchdb:5984/mcm-master';

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
    req.vars.chapterdb = 'http://couchdb:5984/' + a.subdomain;
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

let assets = new Assets();
assets.initialize()
  .then(() => {
    let leslie = new LeslieMvp(app, assets);
    leslie.contextModifier = (req, res, context) => {
      context.chapterdb = req.vars.chapterdb;
      context.settings = req.vars.settings;
      context.account = req.vars.account;
      context.member = req.vars.member;
      context.body = req.body;
      context.files = req.files;
      context.query = req.query;
      context.params = req.params;
      context.cookie = (name, value, options) => res.cookie(name, value, options);
      context.clearCookie = (name) => res.clearCookie(name);
    };
    leslie.data.set('ifltie9', '<!--[if lt IE 9]>');
      leslie.data.set('endif', '<![endif]-->');
    leslie.data.set('member', req => req.vars.member);

    leslie.addStylesheet('font-awesome');
    leslie.addStylesheet('app');
    leslie.addStylesheet('themes/leather/theme');

    leslie.get({ presenterName: 'session' });
    leslie.put({ presenterName: 'session' });
    leslie.delete({ presenterName: 'session' });

    leslie.get({ presenterName: 'dashboard', uri: '/chapter/dashboard' });

    leslie.routeTo({
      presenterName: 'newsletters',
      area: 'chapter',
      routes: [
        { verb: 'get' },
        { verb: 'get', action: 'create-form', method: 'create' },
        { verb: 'get', action: ':id', method: 'item' },
        { verb: 'post' }
      ]
    });

    if (!inProduction) {
      console.log('Serving uploaded files from express at ' + __dirname);
      app.use((req, res, next) => {
        if (res.get('X-Accel-Redirect')) {
          let path = res.get('X-Accel-Redirect').replace('/mcm-files', '');
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
    }

    app.listen(3000);
  })
  .catch(e => console.log(`${e.message}\n${e.stack}`));
