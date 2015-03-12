var gulp = require('gulp');
var babel = require('gulp-babel');
var server = require('gulp-develop-server');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var sync = require('browser-sync');

var reloading = false;

function sourceMapsInDevelopment(source, pipe) {
  var stream = gulp.src(source);
  if (!forProduction) {
    stream = stream.pipe(sourcemaps.init())
  }
  stream = stream.pipe(pipe);
  if (!forProduction) {
    stream = stream.pipe(sourcemaps.write())
  }
  stream = stream.pipe(gulp.dest("dist"));
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
  return sourceMapsInDevelopment(source, sass());
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

gulp.task('watch', [ 'dist' ], function () {
  gulp.watch('./dist/**/*.*', [ 'reserve' ]);

  gulp.watch('./src/**/*.scss', [ 'sass' ]);
  gulp.watch([ './src/app.js', './src/**/controller.js' ], [ 'es6-server' ]);
});

gulp.task('dev', [ 'dist', 'serve', 'watch' ]);
gulp.task('default', [ 'dist' ]);
gulp.task('dist', [ 'sass', 'es6-server' ]);
