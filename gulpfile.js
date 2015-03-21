var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var babel = require('gulp-babel');
var concat = require('gulp-concat');
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

function promisify(scope, method) {
  var args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  var fn = scope[method].bind.apply(scope[method], args);
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
  var chapterName = 'rhog';
  var masterurl = 'http://couchdb:5984/mcm-master';
  var chapterurl = 'http://couchdb:5984/' + chapterName;
  var db = nano(masterurl);
  var dbms = nano(db.config.url);
  var account = require('./build/models/account');
  var settings = require('./build/models/settings');
  var member = require('./build/models/member');
  var newsletter = require('./build/models/newsletter');
  var lookup = {
    account: account,
    settings: settings,
    member: member,
    newsletter: newsletter
  };

  promisify(dbms.db, 'destroy', db.config.db)
    .then(function () { return promisify(dbms.db, 'create', db.config.db); })
    .then(function () { return promisify(dbms.db, 'destroy', chapterName); })
    .then(function () { return promisify(dbms.db, 'create', chapterName); })
    .then(function () {
      return Promise.all([
        promisify(account.to(masterurl), 'sync'),
        promisify(settings.to(chapterurl), 'sync'),
        promisify(member.to(chapterurl), 'sync'),
        promisify(newsletter.to(chapterurl), 'sync')
      ]);
    })
    .then(function () {
      return promisify(fs, 'readFile', './seed.json', 'utf8');
    })
    .then(function (seeds) {
      seeds = JSON.parse(seeds);
      var promises = [];

      for (var i = 0; i < seeds.length; i += 1) {
        var seed = seeds[i];
        var builder = lookup[seed.type];
        var instance = builder.new(seed);
        var url = chapterurl;
        if (seed.type === 'account') {
          url = masterurl;
        }
        var promise = promisify(instance.to(url), 'save');
        promises.push(promise);
      }
      return Promise.all(promises);
    })
    .then(function () { cb(); })
    .catch(function (e) {
      console.error('ERROR!', e);
      cb(e);
    });
});

gulp.task('es6-client', function () {
  return sourceMapsInDevelopment({
    source: [ './src/presenters/*/scripts/*.js', './src/scripts/*.js', '!./src/scripts/shiv.js' ],
    dest: './build/public/scripts',
    betweenMaps: function (stream) {
      return stream.pipe(babel({ modules: 'ignore' }))
        .pipe(concat('app.js'));
    }
  });
});

gulp.task('es3-shiv', function () {
  return sourceMapsInDevelopment({
    source: './src/scripts/shiv.js',
    dest: './build/public/scripts',
    betweenMaps: function (stream) {
      return stream;
    }
  });
});

gulp.task('es6-server', function () {
  return sourceMapsInDevelopment({
    source: [ './src/**/*.js', '!./src/presenters/*/scripts/*.js', '!./src/scripts/*.js' ],
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
    exec('echo "let presenter = {\n  get(ac) {\n    ac.render({});\n  }\n};\n\nexport default presenter;" > src/presenters/' + argv.name + '/presenter.js', function (e) {
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
        'Google Chrome Canary',
        'Google Chrome',
        'Safari',
        'FirefoxDeveloperEdition'
      ],
      notify: false,
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
  gulp.watch([ './src/**/*.js', '!./src/presenters/*/scripts/*.js', '!./src/scripts/*.js' ], [ 'es6-server', 'reserve' ]);
  gulp.watch([ './src/presenters/*/scripts/*.js', './src/scripts/*.js' ], [ 'es6-client', 'reload' ]);
});

gulp.task('build', [ 'sass', 'fonts', 'es6-server', 'es6-client', 'es3-shiv', 'views' ]);
gulp.task('default', [ 'build' ]);
gulp.task('dev', [ 'serve', 'watch' ]);
gulp.task('dist', [ 'label' ]);
