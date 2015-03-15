import 'babel-core/polyfill';
import express from 'express';
import fs from 'fs';
import path from 'path';
import Ractive from 'ractive';
import System from 'systemjs';
import { LeslieMvp } from './leslie';

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

class ScopedAssets {
  constructor(assets, scope) {
    this._assets = assets;
    this._scope = scope;
    this._stylesheets = [];
  }

  add(name) {
    let path = this.getPath(name);
    let a = this._assets.translate(path);
    this._stylesheets.push(a)
  }

  getPath(name) {
    if (!this._scope) {
      return `styles/${name}.css`;
    }
    return `presenters/${this._scope}/styles/${name}.css`;
  }

  request(path) {
    let newScope = new ScopedAssets(this._assets, path);
    newScope._stylesheets = this._stylesheets;
    return newScope;
  }

  get stylesheets() {
    return Array.from(this._stylesheets);
  }
}

class Assets {
  initialize() {
    let options = { encoding: 'utf8' };
    let source = path.join(pwd, 'asset-hashes.json');
    this._stylesheets = [];
    let self = this;
    return promisify(fs.readFile.bind(fs, source, options))
      .then(content => {
        self._translations = JSON.parse(content);
      })
  }

  add(name) {
    let path = this.getPath(name);
    let a = this.translate(path);
    this._stylesheets.push(a)
  }

  getPath(name) {
    if (!this._scope) {
      return `styles/${name}.css`;
    }
    return `presenters/${this._scope}/styles/${name}.css`;
  }

  request(path) {
    let newScope = new ScopedAssets(this, path);
    newScope._stylesheets = Array.from(this._stylesheets);
    return newScope;
  }

  translate(name) {
    return this._translations[name] || this._translations[name.substring(1)];
  }
}

let assets = new Assets();
assets.initialize()
  .then(() => {
    let leslieMvp = new LeslieMvp(app, assets);

    leslieMvp.addStylesheet('font-awesome');
    leslieMvp.addStylesheet('app');
    leslieMvp.addStylesheet('themes/leather/theme');
    leslieMvp.get({ presenterName: 'session' });

    app.listen(3000);
  })
  .catch(e => console.log(`${e.message}\n${e.stack}`));
