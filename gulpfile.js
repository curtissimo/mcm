var gulp = require('gulp');
var babel = require('gulp-babel');
var del = require('del');
var exec = require('child_process').exec;
var fs = require('fs');
var server = null;

gulp.task('clean', function (cb) {
  del('./build', function (builderr) {
    if (builderr) {
      return cb(err);
    }
    del('./dist', function (disterr) {
      if (disterr) {
        return cb(disterr);
      }
      del('./src/inbound/models', cb);
    });
  });
});

gulp.task('grab-models', function (cb) {
  var path = __dirname + '/../sites/src/models/*.js';
  var to = __dirname + '/src/inbound/models';
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
gulp.task('dev', [ 'build', 'watch' ]);
gulp.task('dist', [ 'label' ]);
