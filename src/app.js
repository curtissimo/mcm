import 'babel-core/polyfill';
import express from 'express';
import fs from 'fs';
import path from 'path';

let app = express();
let inProduction = process.env.NODE_ENV === 'production';

if (!inProduction) {
  console.log('Serving public files from express at ' + __dirname);
  app.use(express.static(path.join(__dirname, 'public')));
}

app.get('/session', (req, res) => {
  res.send('<html><head><title>Hi</title><link rel="stylesheet" href="/styles/font-awesome-8d61e0f1.css"></head><body><h1>HI!</h1><i class="fa fa-mercury"></i></body></html>');
})

var server = app.listen(3000, () => {
  let host = server.address().address;
  let port = server.address().port;

  console.log('MCM listening at http://%s:%s', host, port);
});
