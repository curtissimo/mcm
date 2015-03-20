import fs from 'fs';
import util from 'util';
import Ractive from 'ractive';

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

Promise.hash = o => {
  let keys = Object.keys(o);
  let values = [];
  for (let key of keys) {
    values.push(o[key]);
  }
  return new Promise((good, bad) => {
    Promise.all(values)
      .then(result => {
        var o = {};
        for (let i = 0; i < keys.length; i += 1) {
          o[keys[i]] = result[i];
        }
        good(o);
      })
      .catch(error => bad(error));
  });
}


/** DIRECTIVES ****************************************************************/
export class Directive {
  handle(res, next) {
    if (this.code < 400) {
      res.status(this.code);
      return res.send(this.content);
    }
    next(this);
  }
}

export class RedirectDirective extends Directive {
  constructor(href) {
    this._href = href;
  }

  handle(res) {
    res.redirect(this._href);
  }
}

export class NotModifiedDirective extends Directive {
  constructor() {
    this.code = 304;
    this.content = '';
  }
}

/** VIEWS *********************************************************************/
class View {
  constructor(data, viewName, presenterName) {
    let options = { encoding: 'utf8' };
    let source = `${__dirname}/presenters/${presenterName}/views/${viewName}`;
    if (!presenterName) {
      source = `${__dirname}/views/${viewName || 'get'}`;
    }
    source += '.ractive';

    this._loader = promisify(fs.readFile.bind(fs, source, options));
    this._data = data;
  }

  render() {
    return this._loader
      .then(content => {
        let html = new Ractive({
          template: JSON.parse(content),
          data: this._data
        }).toHTML();
        return { data: this._data, html: html };
      });
  }
}

/** PRESENTERS ****************************************************************/
class PresentationContext {
  constructor(good, bad, assets) {
    this._good = good;
    this._bad = bad;
    this._assets = assets;
  }

  addStylesheet(name) {
    this._assets.add(name);
  }

  render({ view: v, data: d = {}, presenters: p = {}}) {
    this._good({ view: v, data: d, presenters: p });
  }

  redirect(href) {
    this._bad(new RedirectDirective(href));
  }

  notModified() {
    this._bad(new NotModifiedDirective());
  }
}

class PresenterInvoker {
  constructor(presenter, methodName, assets, modifier) {
    this._presenter = presenter;
    this._methodName = methodName;
    this._assets = assets;
    this._modifier = modifier;
  }

  invoke() {
    let self = this;
    return new Promise((good, bad) => {
      let context = new PresentationContext(good, bad, self._assets);
      context = self._modifier(context);
      self._presenter[self._methodName](context);
    });
  }
}

export class Presenter {
  constructor(name, method, assets, modifier, data, isRootRequest) {
    this._name = name;
    this._loader = Promise.resolve(require(__dirname + `/presenters/${name}/presenter`));
    this._method = method;
    this._assets = assets;
    this._modifier = modifier;
    this._data = data;
    this._isRootRequest = !!isRootRequest;
  }

  render() {
    let self = this;
    return this._loader
      .then(m => new PresenterInvoker(m, self._method, self._assets, self._modifier).invoke())
      .then(({view: v, data: d = {}, presenters: p = {}}) => {
        this._method = v || this._method;
        for (let key of Object.keys(p)) {
          let value = p[key];
          if (typeof value === 'string') {
            d[key] = new Presenter(value, 'get', this._assets.request(value), self._modifier).render();
          }
        }
        d.stylesheets = this._assets.stylesheets;
        return Promise.hash(d);
      })
      .then(data => new View(data, this._method, this._name).render())
      .then(content => {
        if (!this._isRootRequest) {
          return content.html;
        }
        return new Promise((good, bad) => {
          let data = content.data;
          Object.assign(data, self._data);
          data.content = content.html;
          new View(data).render()
            .then(c => good(c.html))
            .catch(() => good(content.html));
        });
      });
  }
}

export class LeslieMvp {
  constructor(expressApp, assets) {
    this._expressApp = expressApp;
    this._contextModifier = (_, __, o) => o;
    this._assets = assets;
    this._stylesheets = [];
    this._data = new Map();
  }

  addStylesheet(stylesheet) {
    this._assets.add(stylesheet);
  }

  get({ presenterName: p, uri: r }) {
    this._method({ methodName: 'get', presenterName: p, uri: r });
  }

  put({ presenterName: p, uri: r }) {
    this._method({ methodName: 'put', presenterName: p, uri: r });
  }

  delete({ presenterName: p, uri: r }) {
    this._method({ methodName: 'delete', presenterName: p, uri: r });
  }

  _method({ methodName: m, presenterName: p, uri: r }) {
    if (!r) {
      r = `/${p}`;
    }

    let self = this;
    this._expressApp[m](r, function (req, res, next) {
      let modifier = self._contextModifier.bind(null, req, res);
      let data = {};
      for (let [ key, value ] of self._data.entries()) {
        data[key] = value;
        if (typeof value === 'function') {
          data[key] = value(req);
        }
      }
      let presenter = new Presenter(p, m, self._assets.request(p), modifier, data, true);

      presenter.render()
        .then(output => res.send(output))
        .catch(directive => {
          if (typeof directive.handle === 'function') {
            directive.handle(res, next);
          } else {
            let output = `${directive.message}\n${directive.stack}`;
            console.error(output);
          }
        })
    });
  }

  set contextModifier(value) {
    if (typeof value === 'function') {
      this._contextModifier = (req, res, o) => value(req, res, o) || o;
    }
  }

  get data() { return this._data; }
}
