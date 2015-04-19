var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
var csso = require('gulp-csso');
var hash = require('gulp-hash');
var jsmin = require('gulp-jsmin');
var ractive = require('gulp-ractive');
var server = require('gulp-develop-server');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var exec = require('child_process').exec;
var fs = require('fs');
var minimist = require('minimist');
var sync = require('browser-sync');
var gulpdb = require('./gulp-db-tasks');

var argv = minimist(process.argv.slice(2));
if (argv._[0] === 'dist') {
  process.env.NODE_ENV = 'production';
}

process.env.MCM_DB = 'http://couchdb:5984';
process.env.MCM_RABBIT_URL = 'amqp://curtis:curtis@web-server';

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

gulpdb.initialize(gulp, process.env.MCM_DB);

gulp.task('clean', function (cb) {
  del('./build', function (err) {
    if (err) {
      return cb(err);
    }
    del('./dist', cb);
  });
});

gulp.task('es3', function () {
  return sourceMapsInDevelopment({
    source: [ './src/scripts/shiv.js', './src/scripts/squire-raw.js', './src/scripts/ractive-legacy.js' ],
    dest: './build/public/scripts',
    betweenMaps: function (stream) {
      return stream.pipe(jsmin())
        .pipe(hash());
    },
    afterDist: function (stream) {
      return stream
        .pipe(hash.manifest('es3-asset-hashes.json'))
        .pipe(gulp.dest('./build'));
    }
  });
});

gulp.task('es6-client', function () {
  return sourceMapsInDevelopment({
    source: [ './src/**/scripts/*.js', '!./src/scripts/shiv.js', '!./src/scripts/squire-raw.js', '!./src/scripts/ractive.js', '!./src/scripts/ractive-legacy.js' ],
    dest: './build/public',
    betweenMaps: function (stream) {
      return stream.pipe(babel({ modules: 'ignore' }))
        .pipe(concat('scripts/app.js'))
        .pipe(hash());
    },
    afterDist: function (stream) {
      return stream
        .pipe(hash.manifest('es-asset-hashes.json'))
        .pipe(gulp.dest('./build'));
    }
  });
});

gulp.task('es6-server', function () {
  return gulp.src([ './src/**/*.js', '!./src/presenters/*/scripts/*.js', '!./src/scripts/*.js' ])
    .pipe(babel())
    .pipe(gulp.dest('./build'));
});

gulp.task('files-dir', function (cb) {
  fs.mkdir('./build', function (e) {
    if (e && e.code !== 'EEXIST') {
      return cb(e);
    }
    fs.mkdir('./build/files', function (e) {
      if (e && e.code !== 'EEXIST') {
        return cb(e);
      }
      cb();
    });
  });
});

gulp.task('files', [ 'files-dir' ], function (cb) {
  return gulp.src('./src/files/**/*.*')
    .pipe(gulp.dest('./build/files'));
});

gulp.task('fonts', function () {
  return gulp.src('./src/fonts/*')
    .pipe(gulp.dest('./build/public/fonts'));
});

gulp.task('images', function () {
  return gulp.src('./src/images/*')
    .pipe(gulp.dest('./build/public/images'));
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
    exec('echo "let presenter = {\n  list(ac) {\n    ac.render({});\n  }\n};\n\nexport default presenter;" > src/presenters/' + argv.name + '/presenter.js', function (e) {
      if (e) {
        return cb(e);
      }
      exec('touch src/presenters/' + argv.name + '/views/list.ractive', function (e) {
        cb(e);
      });
    });
  });
});

gulp.task('new:view', function (cb) {
  var argv = minimist(process.argv.slice(2));
  exec('touch ./src/presenters/' + argv.presenter + '/views/' + argv.name + '.ractive', cb);
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
        console.error(err);
        cb(err);
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
        // stream = stream.pipe(csso())
      }
      return stream.pipe(hash());
    },
    dest: './build/public',
    afterDist: function (stream) {
      return stream.pipe(hash.manifest('css-asset-hashes.json'))
        .pipe(gulp.dest('./build'));
    }
  });
});

gulp.task('serve', [ 'build' ], function () {
  var opts = {
    env: {
      MCM_DB: process.env.MCM_DB,
      MCM_RABBIT_URL: process.env.MCM_RABBIT_URL
    },
    path: './build/app.js'
  }
  server.listen(opts, function (err) {
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
      notify: false,
      startPath: '/chapter/emails',
      proxy: 'http://localhost:3000'
    });
  });
});

gulp.task('html', function () {
  return gulp.src('./src/views/*.html')
    .pipe(gulp.dest('./build/public'));
});

gulp.task('views', function () {
  return gulp.src('./src/**/*.ractive')
    .pipe(ractive())
    .pipe(gulp.dest('./build'));
});

gulp.task('watch', [ 'build' ], function () {
  gulp.watch([ './build/**/*.js', './build/*-asset-hashes.json' ], [ 'reserve' ]);

  gulp.watch('./src/views/document.html', [ 'html' ]);
  gulp.watch('./src/images/*.*', [ 'images', 'reload' ]);
  gulp.watch('./src/fonts/*.*', [ 'fonts', 'reload' ]);
  gulp.watch('./src/**/*.scss', [ 'sass', 'reload' ]);
  gulp.watch('./src/**/*.ractive', [ 'views', 'reload' ]);
  gulp.watch([ './src/**/*.js', '!./src/presenters/*/scripts/*.js', '!./src/scripts/*.js' ], [ 'es6-server', 'reserve' ]);
  gulp.watch([ './src/presenters/*/scripts/*.js', './src/scripts/*.js' ], [ 'es6-client', 'reload' ]);
});

gulp.task('build', [ 'html', 'sass', 'fonts', 'images', 'es6-server', 'es6-client', 'es3', 'views', 'files-dir', 'files' ]);
gulp.task('default', [ 'build' ]);
gulp.task('dev', [ 'serve', 'watch' ]);
gulp.task('dist', [ 'label' ]);
