var gulp = require('gulp');
var del = require('del');

gulp.task('clean', function (cb) {
  del('./dist', cb);
});

gulp.task('dist', function () {
  return gulp.src('src/**/*.*')
    .pipe(gulp.dest('dist/'));
});

gulp.task('default', []);
