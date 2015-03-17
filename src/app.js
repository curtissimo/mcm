import 'babel-core/polyfill';
import express from 'express';
import path from 'path';
import Ractive from 'ractive';
import { LeslieMvp } from './leslie';
import account from './models/account';
import { Assets } from './assets';
import { inspect as ins } from 'util';

let app = express();
let inProduction = process.env.NODE_ENV === 'production';

if (!inProduction) {
  console.log('Serving public files from express at ' + __dirname);
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '365d'
  }));
}

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
  account.from(req.vars.masterdb).byUrl(server, function (e, a) {
    a = a[0];
    req.vars.chapterdb = 'http://couchdb15:5984/' + a.subdomain;
    next();
  });
});

let assets = new Assets();
assets.initialize()
  .then(() => {
    let leslieMvp = new LeslieMvp(app, assets);
    leslieMvp.contextModifier = (req, res, context) => {
      context.chapterdb = req.vars.chapterdb;
    };

    leslieMvp.addStylesheet('font-awesome');
    leslieMvp.addStylesheet('app');
    leslieMvp.addStylesheet('themes/leather/theme');
    leslieMvp.get({ presenterName: 'session' });
    leslieMvp.put({ presenterName: 'session' });

    app.listen(3000);
  })
  .catch(e => console.log(`${e.message}\n${e.stack}`));
