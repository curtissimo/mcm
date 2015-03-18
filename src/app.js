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

app.use(function (req, res, next) {
  if (req.url.startsWith('/session') && req.method === 'POST') {
    req.method = 'PUT';
  }
  next();
});

app.use(function (req, res, next) {
  if (req.vars === undefined) {
    req.vars = {};
  }
  let server = req.get('x-forwarded-server') || req.hostname;
  req.vars.masterdb = 'http://couchdb15:5984/mcm-master';

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
    req.vars.chapterdb = 'http://couchdb15:5984/' + a.subdomain;
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

app.use(function (req, res, next) {
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

let assets = new Assets();
assets.initialize()
  .then(() => {
    let leslieMvp = new LeslieMvp(app, assets);
    leslieMvp.contextModifier = (req, res, context) => {
      context.chapterdb = req.vars.chapterdb;
      context.settings = req.vars.settings;
      context.account = req.vars.account;
      context.member = req.vars.member;
      context.body = req.body;
      context.query = req.query;
      context.cookie = (name, value) => res.cookie(name, value, { httpOnly: true, expires: new Date(Date.now() + 900000) });
      context.clearCookie = (name) => res.clearCookie(name);
    };
    leslieMvp.data.set('ifltie9', '<!--[if lt IE 9]>');
    leslieMvp.data.set('endif', '<![endif]-->');

    leslieMvp.addStylesheet('font-awesome');
    leslieMvp.addStylesheet('app');
    leslieMvp.addStylesheet('themes/leather/theme');
    leslieMvp.get({ presenterName: 'session' });
    leslieMvp.put({ presenterName: 'session' });

    app.listen(3000);
  })
  .catch(e => console.log(`${e.message}\n${e.stack}`));
