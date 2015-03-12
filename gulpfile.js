var gulp = require('gulp');
var server = require('gulp-develop-server');
var del = require('del');
var sync = require('browser-sync');

gulp.task('clean', function (cb) {
  del('./dist', cb);
});

gulp.task('dist', function () {
  return gulp.src('./src/**/*.*')
    .pipe(gulp.dest('./dist/'));
});

gulp.task('reserve', function () {
  server.restart(function (err) {
    if (err) {
      return console.error(err);
    }
    sync.reload();
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
  gulp.watch('./dist/app.js', [ 'reserve' ]);

  gulp.watch('./src/app.js', [ 'dist' ]);
});

gulp.task('dev', [ 'serve', 'watch' ]);
gulp.task('default', [ 'dist' ]);
