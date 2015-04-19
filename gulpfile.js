var gulp = require('gulp');
var del = require('del');
var rename = require('gulp-rename');
var babel = require('gulp-babel');
var keepup = require('keepup');

var mailerDaemon = null;

process.env.MCM_RABBIT_URL = 'amqp://curtis:curtis@web-server';
process.env.MCM_DB = 'http://couchdb:5984';
process.env.MCM_MAIL_HOST = 'web-server';

gulp.task('build:es6-client', function () {
  return gulp.src('./src/sites/scripts/*.es6')
    .pipe(babel())
    .pipe(rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(gulp.dest('./build/sites/public/scripts/'));
});

gulp.task('build:es6-server', function () {
  return gulp.src([ './src/**/*.es6', '!./src/sites/scripts/*.es6' ])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(gulp.dest('./build'));
})

gulp.task('build:es6', [ 'build:es6-server', 'build:es6-client' ]);

gulp.task('clean', function (next) {
  del([ './build', './dist' ], function (e) {
    next(e);
  });
});

gulp.task('run:reload:mailer', [ 'build:es6-server' ], function (next) {
  mailerDaemon.reload()
    .once('start', next());
});

gulp.task('run:start:mailer', [ 'build:es6-server' ], function (next) {
  mailerDaemon = keepup('npm run mailer-daemon')
    .once('start', next)
    .on('crash', function (data) {
      console.error('Mailer crashed:', data.captured);
    })
    .on('stderr', function (buf) {
      console.error('Mailer:', buf.toString());
    })
    .on('data', function (buf) {
      console.log('Mailer:', buf.toString());
    });
});

gulp.task('run', [ 'run:start:mailer' ]);
