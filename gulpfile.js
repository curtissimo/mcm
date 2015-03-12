var gulp = require('gulp');
var autoprefixer = require('gulp-autoprefixer');
var babel = require('gulp-babel');
var ractive = require('gulp-ractive');
var server = require('gulp-develop-server');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var sync = require('browser-sync');

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

function sourceMapsInDevelopment(source, pipe, dest, cb) {
  var stream = gulp.src(source);
  if (typeof dest === 'function') {
    cb = dest;
    dest = null;
  }
  if (typeof cb !== 'function') {
    cb = function (s) { return s; };
  }
  dest = dest || './dist';
  if (!forProduction) {
    stream = stream.pipe(sourcemaps.init())
  }
  stream = stream.pipe(pipe);
  stream = cb(stream);
  if (!forProduction) {
    stream = stream.pipe(sourcemaps.write())
  }
  stream = stream.pipe(gulp.dest(dest));
}
var forProduction = process.env.NODE_ENV === 'production';

gulp.task('clean', function (cb) {
  del('./dist', cb);
});

gulp.task('es6-server', function () {
  var source = [ './src/app.js', './src/**/controller.js' ];
  return sourceMapsInDevelopment(source, babel());
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
  var source = [ './src/**/*.scss' ];
  var s = sass({
    outputStyle: 'expanded',
    precision: 10
  });
  return sourceMapsInDevelopment(source, s, './dist/public', function (stream) {
    return stream.pipe(autoprefixer(AUTOPREFIXER_BROWSERS));
  });
});

gulp.task('serve', function () {
  server.listen({ path: './dist/app.js' }, function (err) {
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
      proxy: 'http://localhost:3000'
    });
  });
});

gulp.task('views', function () {
  return gulp.src('./src/**/*.ractive')
    .pipe(ractive())
    .pipe(gulp.dest('./dist'));
});

gulp.task('watch', [ 'dist' ], function () {
  gulp.watch('./dist/**/*.*', [ 'reserve' ]);

  gulp.watch('./src/**/*.scss', [ 'sass' ]);
  gulp.watch('./src/**/*.ractive', [ 'views' ]);
  gulp.watch([ './src/app.js', './src/**/controller.js' ], [ 'es6-server' ]);
});

gulp.task('dev', [ 'dist', 'serve', 'watch' ]);
gulp.task('default', [ 'dist' ]);
gulp.task('dist', [ 'sass', 'es6-server', 'views' ]);
