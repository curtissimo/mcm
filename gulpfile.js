var gulp = require('gulp');
var babel = require('gulp-babel');
var del = require('del');
var exec = require('child_process').exec;
var fs = require('fs');
var server = null;

gulp.task('clean', function (cb) {
  del('./build', function (err) {
    if (err) {
      return cb(err);
    }
    del('./dist', cb);
  });
});

gulp.task('grab-models', function (cb) {
  var path = __dirname + '/../sites/src/models/email.js';
  var to = __dirname + '/src/models';
  exec('mkdir -p ' + to, function (e) {
    if (e) {
      return cb(e);
    }
    exec('cp ' + path + ' ' + to, function (err) {
      cb(err);
    });
  });
});

gulp.task('es6', [ 'grab-models' ], function () {
  return gulp.src([ './src/**/*.js' ])
    .pipe(babel())
    .pipe(gulp.dest('./build'));
});

gulp.task('config', [ 'grab-models' ], function () {
  return gulp.src([ './src/**/config/*' ])
    .pipe(gulp.dest('./build'));
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

gulp.task('watch', [ 'build' ], function () {
  gulp.watch('./src/**/*.js', [ 'es6' ]);
});

gulp.task('build', [ 'es6', 'config' ]);
gulp.task('default', [ 'build' ]);
gulp.task('dev', [ 'build', 'serve', 'watch' ]);
gulp.task('dist', [ 'label' ]);
