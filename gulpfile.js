var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var babel = require('gulp-babel');
var csso = require('gulp-csso');
var hash = require('gulp-hash');
var ractive = require('gulp-ractive');
var server = require('gulp-develop-server');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var exec = require('child_process').exec;
var fs = require('fs');
var minimist = require('minimist');
var nano = require('nano');
var sync = require('browser-sync');

var forProduction = process.env.NODE_ENV === 'production';
var reloading = null;
var AUTOPREFIXER_BROWSERS = [
  'ie >= 8',
  'ie_mob >= 7',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

function promisify(fn) {
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err) {
        return bad(err);
      }
      try {
        good(value);
      } catch (e) {
        bad(e);
      }
    });
  })
}

function sourceMapsInDevelopment(options) {
  var source = options.source;
  var pipe = options.pipe;
  var dest = options.dest || './build';
  var betweenMaps = options.betweenMaps || function (s) { return s; };
  var afterDist = options.afterDist || function (s) { return s; };
  var stream = gulp.src(source);

  if (!forProduction) {
    stream = stream.pipe(sourcemaps.init())
  }
  stream = betweenMaps(stream);
  if (!forProduction) {
    stream = stream.pipe(sourcemaps.write())
  }
  stream = stream.pipe(gulp.dest(dest));
  return afterDist(stream);
}

gulp.task('clean', function (cb) {
  del('./build', function (err) {
    if (err) {
      return cb(err);
    }
    del('./dist', cb);
  });
});

gulp.task('db', [ 'es6-server' ], function (cb) {
  var url = 'http://couchdb15:5984/mcm-master';
  var db = nano(url);
  var dbms = nano(db.config.url);
  var account = require('./build/models/account');

  promisify(dbms.db.destroy.bind(dbms.db, db.config.db))
    .then(function () { return promisify(dbms.db.create.bind(dbms.db, db.config.db)); })
    .then(function () {
      var to = account.to(url);
      return promisify(to.sync.bind(to));
    })
    .then(function () {
      var a = account.new();
      a.name = 'Republic H.O.G.';
      a.subdomain = 'rhog';
      a.domain = 'republichog.org';
      var to = a.to(url);
      return promisify(to.save.bind(to));
    })
    .then(function () { cb(); })
    .catch(function (e) {
      console.error('ERROR!', e);
      cb(e);
    });
});

gulp.task('es6-app', function () {
  return sourceMapsInDevelopment({
    source: './src/**/*.js',
    betweenMaps: function (stream) {
      return stream.pipe(babel());
    }
  });
});

gulp.task('fonts', function () {
  return gulp.src('./src/fonts/*')
    .pipe(gulp.dest('./build/public/fonts'));
});

gulp.task('label', [ 'build' ], function (cb) {
  exec('cp -R ./build ./dist', function (e) {
    var now = new Date();
    var content = JSON.stringify({
      version: now.valueOf(),
      author: process.env.USER
    });
    fs.writeFile('./dist/stamp.json', content, cb);
  });
});

gulp.task('new:presenter', function (cb) {
  var argv = minimist(process.argv.slice(2));
  exec('mkdir -p src/presenters/' + argv.name + '/{views,styles}', function (e) {
    if (e) {
      return cb(e)
    }
    exec('echo "let presenter = {\n  get(ac) {\n    ac.render({});\n  }\n};\n\nexport default presenter;\nexport var __useDefault = true; // Stupid hack for system.js" > src/presenters/' + argv.name + '/presenter.js', function (e) {
      if (e) {
        return cb(e);
      }
      exec('touch src/presenters/' + argv.name + '/views/get.ractive', function (e) {
        cb(e);
      });
    });
  });
});

gulp.task('reload', [ 'sass', 'views', 'fonts' ], function (cb) {
  sync.reload();
  cb();
});

gulp.task('reserve', function (cb) {
  if (reloading) {
    clearTimeout(reloading);
  }
  reloading = setTimeout(function () {
    server.restart(function (err) {
      if (err) {
        return console.error(err);
      } else {
        sync.reload();
      }
      reloading = null;
      cb();
    });
  }, 500);
});

gulp.task('sass', function () {
  var options = { precision: 10 };
  if (!forProduction) {
    options.sourceComments = true;
  }
  return sourceMapsInDevelopment({
    source: './src/**/*.scss',
    betweenMaps: function (stream) {
      stream = stream.pipe(sass(options))
        .pipe(autoprefixer(AUTOPREFIXER_BROWSERS));
      if (forProduction) {
        stream = stream.pipe(csso())
      }
      return stream.pipe(hash());
    },
    dest: './build/public',
    afterDist: function (stream) {
      return stream.pipe(hash.manifest('asset-hashes.json'))
        .pipe(gulp.dest('./build'));
    }
  });
});

gulp.task('serve', [ 'build' ], function () {
  server.listen({ path: './build/app.js' }, function (err) {
    if (err) {
      return console.error(err);
    }
    sync({
      browser: [
        // 'Google Chrome Canary',
        // 'Google Chrome',
        // 'Safari',
        'FirefoxDeveloperEdition'
      ],
      startPath: '/session',
      proxy: 'http://localhost:3000'
    });
  });
});

gulp.task('views', function () {
  return gulp.src('./src/**/*.ractive')
    .pipe(ractive())
    .pipe(gulp.dest('./build'));
});

gulp.task('watch', [ 'build' ], function () {
  gulp.watch([ './build/**/*.js', './build/asset-hashes.json' ], [ 'reserve' ]);

  gulp.watch('./src/fonts/*.*', [ 'fonts', 'reload' ]);
  gulp.watch('./src/**/*.scss', [ 'sass', 'reload' ]);
  gulp.watch('./src/**/*.ractive', [ 'views', 'reload' ]);
  gulp.watch('./src/*.js', [ 'es6-app' ]);
});

gulp.task('build', [ 'sass', 'fonts', 'es6-server', 'views' ]);
gulp.task('default', [ 'build' ]);
gulp.task('dev', [ 'serve', 'watch' ]);
gulp.task('dist', [ 'label' ]);
gulp.task('es6-server', [ 'es6-app' ]);
