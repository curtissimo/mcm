var gulp = require('gulp');
var webserver = require('gulp-develop-server');

var reloading = false;
var sync;

gulp.task('run:refresh', [ 'build:es6-server' ], function (next) {
  if (reloading) {
    clearTimeout(reloading);
  }
  reloading = setTimeout(function () {
    webserver.restart(function (err) {
      if (err) {
        console.error(err);
        sync.exit();
        return next(err);
      }
      sync.reload({once: true});
      reloading = null;
      next();
    })
  });
});

gulp.task('run:site', [ 'build' ], function (next) {
  var serverOpts = {
    env: process.env,
    path: './build/sites/app.js'
  };
  var syncOpts = {
    browser: [
      // 'Google Chrome Canary',
      // 'Google Chrome',
      // 'Safari',
      'FirefoxDeveloperEdition'
    ],
    notify: false,
    startPath: '/chapter/emails',
    proxy: 'http://localhost:3000'
  };
  webserver.listen(serverOpts, function (err) {
    if (err) {
      return console.error(err);
    }
    sync.init(syncOpts, next);
  });
});

module.exports = function (browserSync) {
  sync = browserSync;
  sync.reloadAssets = function (next) {
    if (!webserver.child) {
      return next();
    }
    webserver.child.once('message', function (m) {
      if (m.assetsReloaded) {
        next();
      }
    });
    webserver.child.send({ reloadAssets: true });
  };
  return webserver;
};
