var gulp = require('gulp');
var server = require('gulp-develop-server');

var reloading = false;
var isWeb = false;
var sync;

gulp.task('run:mailer', [ 'build:es6-mailer' ], function (next) {
  var serverOpts = {
    env: process.env,
    path: './build/mailer-daemon/app.js'
  };
  server.listen(serverOpts);
});

gulp.task('run:refresh', [ 'build:es6-server' ], function (next) {
  if (!isWeb) {
    return next();
  }
  if (reloading) {
    clearTimeout(reloading);
  }
  reloading = setTimeout(function () {
    server.restart(function (err) {
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

gulp.task('run:remail', [ 'build:es6-mailer' ], function (next) {
  if (isWeb) {
    return next();
  }
  server.restart(function (err) {
    next(err);
  });
});

gulp.task('run:site', [ 'build' ], function (next) {
  isWeb = true;
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
  server.listen(serverOpts, function (err) {
    if (err) {
      return console.error(err);
    }
    next();
    setTimeout(function () {
      sync.init(syncOpts);
    }, 1000);
  });
});

module.exports = function (browserSync) {
  sync = browserSync;
  sync.reloadAssets = function (next) {
    if (!server.child) {
      return next();
    }
    server.child.once('message', function (m) {
      if (m.assetsReloaded) {
        next();
      }
    });
    server.child.send({ reloadAssets: true });
  };
  return server;
};
