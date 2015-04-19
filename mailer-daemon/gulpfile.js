var gulp = require('gulp');
var babel = require('gulp-babel');
var del = require('del');
var exec = require('child_process').exec;
var fs = require('fs');
var keepup = require('keepup');
var server = null;

process.env.MCM_RABBIT_URL = 'amqp://curtis:curtis@web-server';
process.env.MCM_DB = 'http://couchdb:5984';
process.env.MCM_MAIL_HOST = 'web-server';

gulp.task('clean', function (cb) {
  del('./build', function (err) {
    if (err) {
      return cb(err);
    }
    del('./dist', cb);
  });
});

gulp.task('es6', function () {
  return gulp.src([ './src/**/*.js' ])
    .pipe(babel())
    .pipe(gulp.dest('./build'));
});

gulp.task('grab-models', function (cb) {
  var path = __dirname + '/../sites/src/models/*.js';
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

gulp.task('reload', [ 'es6' ], function () {
  server.reload();
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

gulp.task('serve', [ 'es6' ], function () {
  server = keepup('npm start')
    .on('start', function (data) {
      console.info('GULP: Server started');
    })
    .on('crash', function (data) {
      console.error('GULP:', data.captured);
    })
    .on('reload', function () {
      console.trace('GULP: Server reloaded');
    })
    .on('data', function (buf) {
      process.stdout.write(buf);
    })
    .on('stderr', function (buf) {
      process.stderr.write(buf);
    });
});

gulp.task('watch', [ 'build' ], function () {
  gulp.watch('./src/**/*.js', [ 'es6', 'reload' ]);
});

gulp.task('build', [ 'es6', 'grab-models' ]);
gulp.task('default', [ 'build' ]);
gulp.task('dev', [ 'build', 'serve', 'watch' ]);
gulp.task('dist', [ 'label' ]);
