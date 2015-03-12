import 'babel-core/polyfill';

import http from 'http';

var server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html><head><title>Hi</title></head><body><h1>HI!</h1><h2>Or, not.</h2></body></html>');
});

server.listen(3000);
