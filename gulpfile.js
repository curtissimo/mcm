var gulp, hbs, lint, nunit, rm, sass;

gulp = require('gulp');
lint = require('gulp-jslint');
nunit = require('gulp-nodeunit-runner');
rm = require('gulp-rimraf');
sass = require('gulp-sass');

hbs = require('./gulp-hbs-support');

gulp.task('ci', [ 'lint', 'hbs', 'sass', 'test' ]);

gulp.task('clean', function () {
  return gulp
    .src([ 'lib/**/views', 'assets/**/*.css' ])
    .pipe(rm());
});

gulp.task('default', [ 'ci', 'watch' ]);

gulp.task('lint', [ 'lint-client', 'lint-server' ]);

gulp.task('lint-client', function () {
  return gulp
    .src('assets/scripts/site.js')
    .pipe(lint({
      browser: true,
      indent: 2,
      errorsOnly: true
    }));
});

gulp.task('lint-server', function () {
  return gulp
    .src([ 'server.js', 'lib/*/*.js' ])
    .pipe(lint({
      node: true,
      indent: 2,
      errorsOnly: true
    }));
});

gulp.task('hbs', hbs.tasks);

gulp.task('sass', function () {
  return gulp
    .src('scss/**/*.*')
    .pipe(sass())
    .pipe(gulp.dest('assets'));
});

gulp.task('test', function () {
  return gulp
    .src('tests/*.js')
    .pipe(nunit());
});

gulp.task('watch', [ 'ci' ], function () {
  hbs.registerWatches();
  gulp.watch('assets/scripts/site.js', [ 'lint-client' ]);
  gulp.watch('lib/*/*.js', [ 'lint-server', 'test' ]);
  gulp.watch('server.js', [ 'lint-server' ]);
  gulp.watch('scss/**/*.scss', [ 'sass' ]);
});
