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
var sync = require('browser-sync');
var fs = require('fs');
var exec = require('child_process').exec;

var forProduction = process.env.NODE_ENV === 'production';
var reloading = false;
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
  var afterMaps = options.afterMaps || function (s) { return s; };
  var stream = gulp.src(source);

  if (!forProduction) {
    stream = stream.pipe(sourcemaps.init())
  }
  stream = betweenMaps(stream);
  if (!forProduction) {
    stream = stream.pipe(sourcemaps.write())
  }
  stream = stream.pipe(gulp.dest(dest));
  return afterMaps(stream);
}

gulp.task('clean', function (cb) {
  del('./build', function (err) {
    if (err) {
      return cb(err);
    }
    del('./dist', cb);
  });
});

gulp.task('es6-server', function () {
  return sourceMapsInDevelopment({
    source: [ './src/app.js', './src/**/controller.js' ],
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

gulp.task('reserve', function (cb) {
  if (reloading) {
    cb();
  }
  reloading = true;
  server.restart(function (err) {
    if (err) {
      return console.error(err);
    } else {
      sync.reload();
    }
    reloading = false;
    cb();
  });
});

gulp.task('sass', function () {
  return sourceMapsInDevelopment({
    source: './src/**/*.scss',
    betweenMaps: function (stream) {
      return stream.pipe(sass({ outputStyle: 'expanded', precision: 10 }))
        .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(csso())
        .pipe(hash());
    },
    dest: './build/public',
    afterMaps: function (stream) {
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
        'FirefoxDeveloperEdition',
        'Google Chrome Canary',
        'Google Chrome',
        'Safari'
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
  gulp.watch('./build/**/*.*', [ 'reserve' ]);

  gulp.watch('./src/**/*.scss', [ 'sass' ]);
  gulp.watch('./src/**/*.ractive', [ 'views' ]);
  gulp.watch([ './src/app.js', './src/**/controller.js' ], [ 'es6-server' ]);
});

gulp.task('build', [ 'sass', 'fonts', 'es6-server', 'views' ]);
gulp.task('default', [ 'build' ]);
gulp.task('dev', [ 'serve', 'watch' ]);
gulp.task('dist', [ 'label' ]);
