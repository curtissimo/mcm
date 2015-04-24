var gulp = require('gulp');

if (!process.env.MCM_DB) {
  process.env.MCM_DB = 'http://couchdb:5984';
}
if (!process.env.MCM_MAIL_HOST) {
  process.env.MCM_MAIL_HOST = 'web-server';
}
if (!process.env.MCM_RABBIT_URL) {
  process.env.MCM_RABBIT_URL = 'amqp://curtis:curtis@web-server';
}

if (!process.env.DOMAIN) {
  process.env.DOMAIN = 'rhog.ismymc.dev';
}

require('./gulp-tasks/gulp-db').initialize(gulp, process.env.MCM_DB);
var sync = require('./gulp-tasks/gulp-build').sync;
var webserver = require('./gulp-tasks/gulp-run')(sync).webserver;
require('./gulp-tasks/gulp-dist');

process.on('uncaughtException', function(err) {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(err.message, err.stack);
  try {
    sync.exit();
  } catch(e) {
    console.error('Failed to kill browser sync.');
    console.error(err.message, err.stack);
  }
  try {
    webserver.kill();
  } catch(e) {
    console.error('Failed to kill development server.');
    console.error(err.message, err.stack);
  }
});

gulp.task('clean', [ 'dist:clean', 'build:clean' ]);

gulp.task('default', [ 'build' ]);

gulp.task('dev', [ 'run:site', 'watch' ]);

gulp.task('watch', [ 'build' ], function () {
  gulp.watch('./src/sites/scripts/*.js', [ 'build:es3-client' ]);
  gulp.watch('./src/sites/scripts/*.es6', [ 'build:es6-client' ]);
  gulp.watch([ './src/**/*.es6', '!./src/sites/scripts/*.es6' ], [ 'run:refresh' ]);
  gulp.watch('./src/sites/**/*.scss', [ 'build:sass' ]);
  gulp.watch('./src/**/*.ractive', [ 'build:views' ]);
});
