import 'babel-core/polyfill';
import express from 'express';
import fs from 'fs';
import path from 'path';
import Ractive from 'ractive';
import System from 'systemjs';

let app = express();
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

app.get('/session', (req, res) => {
  let options = { encoding: 'utf8' };
  let ac = { view: 'get' };
  System.import('controllers/session/controller')
    .then(m => m.get(ac))
    .then(() => {
      var source = path.join(__dirname, 'controllers/session/views', ac.view);
      source += '.ractive';
      return promisify(fs.readFile.bind(fs, source, options));
    })
    .then(content => {
      let data = ac.data;
      data.stylesheets = [
        '/styles/font-awesome-8d61e0f1.css',
        '/styles/app.css'
      ];
      let r = new Ractive({
        template: JSON.parse(content),
        data: data
      });
      res.send(r.toHTML());
    });
});

var server = app.listen(3000);
