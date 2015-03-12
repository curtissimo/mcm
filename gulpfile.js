var gulp = require('gulp');
var server = require('gulp-develop-server');
var del = require('del');
var sync = require('browser-sync');

var reloading = false;

gulp.task('clean', function (cb) {
  del('./dist', cb);
});

gulp.task('dist', function () {
  return gulp.src('./src/**/*.*')
    .pipe(gulp.dest('./dist/'));
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

  gulp.watch('./src/**/*.*', [ 'dist' ]);
});

gulp.task('dev', [ 'serve', 'watch' ]);
gulp.task('default', [ 'dist' ]);
