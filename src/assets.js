import path from 'path';
import fs from 'fs';

let pwd = __dirname;

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
    this._scripts = [];
  }

  addStylesheet(name) {
    let path = this.getPath(name, 'styles', 'css');
    let a = '/' + this.translate(path);
    this._stylesheets.push(a)
  }

  addScript(name) {
    let path = this.getPath(name, 'scripts', 'js');
    let a = '/' + this.translate(path);
    this._scripts.push(a)
  }

  getPath(name, path, ext) {
    if (!this._scope) {
      return `/${path}/${name}.${ext}`;
    }
    return `/presenters/${this._scope}/${path}/${name}.${ext}`;
  }

  request(path) {
    let newScope = new ScopedAssets(this._assets, path);
    newScope._stylesheets = this._stylesheets;
    return newScope;
  }

  get stylesheets() {
    return Array.from(this._stylesheets);
  }

  get scripts() {
    return Array.from(this._scripts);
  }
}

export class Assets {
  initialize() {
    let options = { encoding: 'utf8' };
    let cssSource = path.join(pwd, 'css-asset-hashes.json');
    let esSource = path.join(pwd, 'es-asset-hashes.json');
    this._stylesheets = [];
    let self = this;
    this._scripts = [];
    return promisify(fs.readFile.bind(fs, cssSource, options))
      .then(content => {
        self._translations = JSON.parse(content);
        return promisify(fs.readFile.bind(fs, esSource, options));
      })
      .then(content => {
        Object.assign(self._translations, JSON.parse(content));
      });
  }

  addStylesheet(name) {
    let path = this.getPath(name, 'styles', 'css');
    let a = '/' + this.translate(path);
    this._stylesheets.push(a)
  }

  addScript(name) {
    let path = this.getPath(name, 'scripts', 'js');
    let a = '/' + this.translate(path);
    this._scripts.push(a)
  }

  getPath(name, path, ext) {
    if (!this._scope) {
      return `/${path}/${name}.${ext}`;
    }
    return `/presenters/${this._scope}/${path}/${name}.${ext}`;
  }

  request(path) {
    let newScope = new ScopedAssets(this, path);
    newScope._stylesheets = Array.from(this._stylesheets);
    newScope._scripts = Array.from(this._scripts);
    newScope.translate = this.translate.bind(this);
    return newScope;
  }

  translate(name) {
    return this._translations[name] || this._translations[name.substring(1)];
  }
}
