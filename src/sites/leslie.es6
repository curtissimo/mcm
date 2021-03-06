import fs from 'fs';
import util from 'util';
import path from 'path';
import Ractive from 'ractive';

function promisify(fn, code) {
  return new Promise((good, bad) => {
    fn((err, value) => {
      if (err || (code && err.code !== code)) {
        return bad(err);
      }
      good(value);
    });
  })
}

Promise.hash = o => {
  let keys = Object.keys(o);
  let symbols = Object.getOwnPropertySymbols(o);
  let values = [];
  for (let key of keys) {
    values.push(o[key]);
  }
  return new Promise((good, bad) => {
    Promise.all(values)
      .then(result => {
        var resolved = {};
        for (let i = 0; i < keys.length; i += 1) {
          resolved[keys[i]] = result[i];
        }
        for (let symbol of symbols) {
          resolved[symbol] = o[symbol];
        }
        good(resolved);
      })
      .catch(error => bad(error));
  });
}


/** DIRECTIVES ****************************************************************/
export class Directive {
  constructor() {
    this.mimeType = 'text/html';
  }

  handle(res, next) {
    if (this.code < 400) {
      return res.status(this.code).type(this.mimeType).end(this.content);
    }
    next(this);
  }
}

export class RedirectDirective extends Directive {
  constructor(href) {
    super();
    this._href = href;
  }

  handle(res) {
    res.redirect(this._href);
  }
}

export class NotFoundDirective extends Directive {
  constructor() {
    super();
    this.code = 404;
    this.content = 'Cannot find that resource.';
  }
}

export class NotModifiedDirective extends Directive {
  constructor() {
    super();
    this.code = 304;
    this.content = '';
  }
}

export class UnauthorizedDirective extends Directive {
  constructor() {
    super();
    this.code = 401;
    this.content = 'You cannot access this resource.';
  }
}

export class CsvDirective extends Directive {
  constructor(fileName, data, headers, ...fields) {
    super();
    this.code = 200;
    this.mimeType = 'text/csv';
    let content = [];
    let row = [];
    for (let field of fields) {
      row.push(headers[field] || field);
    }
    content.push(row.join(','));
    for (let datum of data) {
      row = [];
      for (let field of fields) {
        row.push(datum[field]);
      }
      content.push(row.join(','));
    }
    this.content = content.join('\n');
    this.fileName = fileName;
  }

  handle(res, next) {
    res.set('Content-Disposition', `attachment; filename=${this.fileName}`);
    super.handle(res, next);
  }
}

export class FileDirective extends Directive {
  constructor(path, name = 'attachment', section, download) {
    super();
    this._path = path;
    this._name = name;
    this._download = download;
    this._section = section;
  }

  handle(res, next) {
    let ext = this._name.substring(this._name.lastIndexOf('.'));
    let redirectPath = '/mcm-files/';
    if (this._section) {
      redirectPath += this._section + '/';
    }
    redirectPath += path.basename(this._path);
    res.set('X-Accel-Redirect', redirectPath);
    if (this._download) {
      res.attachment(this._name);
    } else {
      res.set('Content-Disposition', 'inline');
    }
    res.type(ext);
    next();
  }
}

/** VIEWS *********************************************************************/
class View {
  constructor(data, viewName, presenterName) {
    let options = { encoding: 'utf8' };
    let source = `${__dirname}/presenters/${presenterName}/views/${viewName}`;
    if (!presenterName) {
      source = `${__dirname}/views/${viewName}`;
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
  constructor(good, bad, assets, path) {
    this._good = good;
    this._bad = bad;
    this._assets = assets;
    this._path = path;
  }

  addStylesheet(name) {
    this._assets.addStylesheet(name);
  }

  addScript(name) {
    this._assets.addScript(name);
  }

  render({ view: v, data: d = {}, presenters: p = {}, layout: l}) {
    this._good({ view: v, data: d, presenters: p, layout: l || this.layout });
  }

  redirect(href) {
    this._bad(new RedirectDirective(href));
  }

  notFound() {
    this._bad(new NotFoundDirective());
  }

  notModified() {
    this._bad(new NotModifiedDirective());
  }

  unauthorized() {
    this._bad(new UnauthorizedDirective());
  }

  binary(path, name, section) {
    this._bad(new FileDirective(path, name, section));
  }

  file(path, name, section) {
    this._bad(new FileDirective(path, name, section, true));
  }

  csv(fileName, data, headers, ...fields) {
    this._bad(new CsvDirective(fileName, data, headers, ...fields));
  }

  error(e) {
    this._bad(e);
  }

  renderEmails(templateName, data) {
    let baseFile = `${this._path}/mails/${templateName}`;
    let htmlFile = fs.readFile.bind(fs, `${baseFile}.html.ractive`, 'utf8');
    let textFile = fs.readFile.bind(fs, `${baseFile}.text.ractive`, 'utf8');
    return Promise.all([ promisify(htmlFile), promisify(textFile) ])
      .then(([ html, text ]) => {
        html = JSON.parse(html);
        text = JSON.parse(text);
        html = new Ractive({ data: data, template: html }).toHTML();
        text = new Ractive({ data: data, template: text }).toHTML();
        this.mails = { html, text };
        return this.mails;
      });
  };
}

class PresenterInvoker {
  constructor(presenter, methodName, assets, modifier, path) {
    this._presenter = presenter;
    this._methodName = methodName;
    this._assets = assets;
    this._modifier = modifier;
    this._path = path;
  }

  invoke() {
    let self = this;
    return new Promise((good, bad) => {
      let context = new PresentationContext(good, bad, self._assets, self._path);
      context = self._modifier(context);
      self._presenter[self._methodName](context);
    });
  }
}

export class Presenter {
  constructor(name, method, assets, modifier, data, isRootRequest) {
    this._name = name;
    this._path = __dirname + `/presenters/${name}`;
    this._loader = Promise.resolve(require(`${this._path}/presenter`));
    this._method = method;
    this._assets = assets;
    this._modifier = modifier;
    this._data = data;
    this._isRootRequest = !!isRootRequest;
    this._layoutSymbol = Symbol('layout');
  }

  render() {
    let self = this;
    return this._loader
      .then(m => new PresenterInvoker(m, self._method, self._assets, self._modifier, this._path).invoke())
      .then(({view: v, data: d = {}, presenters: p = {}, layout: l = 'application'}) => {
        this._method = v || this._method;
        for (let key of Object.keys(p)) {
          let value = p[key];
          if (typeof value === 'string') {
            d[key] = new Presenter(value, 'get', this._assets.request(value), self._modifier).render();
          }
        }
        d[self._layoutSymbol] = l;
        return Promise.hash(d);
      })
      .then(data => new View(data, this._method, this._name).render())
      .then(content => {
        if (!this._isRootRequest) {
          return content.html;
        }
        content.data.stylesheets = this._assets.stylesheets;
        content.data.scripts = this._assets.scripts;
        return new Promise((good, bad) => {
          let data = content.data;
          let layout = data[self._layoutSymbol];
          Object.assign(data, self._data);
          data.content = content.html;
          new View(data, layout).render()
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
    this._scripts = [];
    this._data = new Map();
  }

  addStylesheet(stylesheet) {
    this._assets.addStylesheet(stylesheet);
  }

  addScript(script) {
    this._assets.addScript(script);
  }

  get({ presenterName: p, uri: r }) {
    this._method({ verb: 'get', presenterName: p, uri: r });
  }

  put({ presenterName: p, uri: r }) {
    this._method({ verb: 'put', presenterName: p, uri: r });
  }

  delete({ presenterName: p, uri: r }) {
    this._method({ verb: 'delete', presenterName: p, uri: r });
  }

  routeTo({ presenterName: presenterName, area: area, routes: routes = [] }) {
    let baseRoute = area ? `/${area}/${presenterName}` : `/${presenterName}`;
    for (let { verb: verb, action: action, method: method} of routes) {
      method = method || verb;
      let route = action ? `${baseRoute}/${action}` : baseRoute;
      this._method({ verb: verb, method: method, presenterName:presenterName, uri: route });
    }
  }

  _method({ verb: verb, method: m, presenterName: p, uri: r }) {
    if (!r) {
      r = `/${p}`;
    }
    m = m || verb;

    let self = this;
    this._expressApp[verb](r, function (req, res, next) {
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
            res.send(output);
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
