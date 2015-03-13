import 'babel-core/polyfill';
import express from 'express';
import fs from 'fs';
import path from 'path';
import Ractive from 'ractive';
import System from 'systemjs';

let app = express();
let pwd = __dirname;
let inProduction = process.env.NODE_ENV === 'production';

if (!inProduction) {
  System.baseURL = './build';

  console.log('Serving public files from express at ' + __dirname);
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '365d'
  }));
}

function promisify(fn) {
  return new Promise((good, bad) => {
    fn((err, value) => {
      if (err) {
        return bad(err);
      }
      good(value);
    });
  })
}

class Assets {
  constructor() {
    let options = { encoding: 'utf8' };
    let source = path.join(pwd, 'asset-hashes.json');
    var self = this;
    promisify(fs.readFile.bind(fs, source, options)).then(content => {
      self._translations = JSON.parse(content);
    });
  }

  translate(name) {
    return this._translations[name] || this._translations[name.substring(1)];
  }
}

let assets = new Assets();

class PresenterContext {
  constructor(httpAction, presenterName) {
    this._view = (httpAction || '').toLowerCase();
    this._name = presenterName;
    this._stylesheets = [];
  }

  get view() { return this._view || 'get'; }
  set view(value) { this._view = value; }

  get name() { return this_name; }

  get stylesheets() { return Array.from(this._stylesheets); }

  addStylesheet(name) {
    if (name !== undefined && name !== null) {
      let assetPath = '/controllers/' + this._name + '/styles/' + name;
      this._stylesheets.push(assetPath)
    }
  }

  loadPresenter() {
    var controllerPath = 'controllers/' + this._name + '/presenter';
    return System.import(controllerPath);
  }
}

app.get('/session', (req, res) => {
  let options = { encoding: 'utf8' };
  let context = new PresenterContext(req.method, 'session');
  context.loadPresenter()
    .then(m => m.get(context))
    .then(() => {
      var source = path.join(__dirname, 'controllers/session/views', context.view);
      source += '.ractive';
      return promisify(fs.readFile.bind(fs, source, options));
    })
    .then(content => {
      let data = context.data;
      let ss = data.stylesheets = [
        assets.translate('/styles/font-awesome.css'),
        assets.translate('/styles/app.css')
      ];
      for (var asset of context.stylesheets) {
        ss.push(assets.translate(asset));
      }
      let r = new Ractive({
        template: JSON.parse(content),
        data: data
      });
      res.send(r.toHTML());
    });
});

var server = app.listen(3000);
