var autoprefixer = require('gulp-autoprefixer');
var babel = require('gulp-babel');
var del = require('del');
var fs = require('fs');
var gulp = require('gulp');
var hash = require('gulp-hash');
var jsmin = require('gulp-jsmin');
var ractive = require('gulp-ractive');
var rename = require('gulp-rename');
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var sync = require('browser-sync').create();
var through = require('through2');

var AUTOPREFIXER_BROWSERS = [
  'ie >= 8',
  'ie_mob >= 7',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var refreshing = null;

function syncIfActive() {
  var stream = through.obj(function(file, enc, cb) {
    var self = this;
    if (file.isBuffer() && sync.active) {
      if (refreshing) {
        clearTimeout(refreshing);
      }
      refreshing = setTimeout(function () {
        sync.reloadAssets(function () {
          refreshing = false;
          sync.reload();
          self.push(file);
          cb();
        });
      }, 250);
    }

    if (file.isStream() && sync.active) {
      sync.reloadAssets(function () {
        file.contents = file.contents.pipe(sync.reload({ stream: true, once: true }));
        self.push(file);
        cb();
      });
    }

    if (!sync.active) {
      this.push(file);
      cb();
    }
  });

  return stream;
}

gulp.task('build:clean', function (next) {
  del('./build', next);
});

gulp.task('build:es3-client', function () {
  return gulp.src('./src/sites/scripts/*.js')
    .pipe(jsmin())
    .pipe(hash())
    .pipe(gulp.dest('./build/sites/public/scripts'))
    .pipe(hash.manifest('es3-asset-hashes.json'))
    .pipe(gulp.dest('./build/sites'))
    .pipe(syncIfActive());
});

gulp.task('build:es6-client', function () {
  return gulp.src('./src/sites/scripts/*.es6')
    .pipe(babel())
    .pipe(rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(hash())
    .pipe(gulp.dest('./build/sites/public/scripts/'))
    .pipe(hash.manifest('es-asset-hashes.json'))
    .pipe(gulp.dest('./build/sites'))
    .pipe(syncIfActive());
});

gulp.task('build:es6-server', function () {
  return gulp.src([ './src/**/*.es6', '!./src/sites/scripts/*.es6' ])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(gulp.dest('./build'));
});

gulp.task('build:files', [ 'build:files-dir' ], function () {
  return gulp.src('./src/sites/files/**/*.*')
    .pipe(gulp.dest('./build/sites/files'));
});

gulp.task('build:files-dir', function (next) {
  fs.mkdir('./build', function (e) {
    if (e && e.code !== 'EEXIST') {
      return next(e);
    }
    fs.mkdir('./build/sites', function (e) {
      if (e && e.code !== 'EEXIST') {
        return next(e);
      }
      fs.mkdir('./build/sites/files', function (e) {
        if (e && e.code !== 'EEXIST') {
          return next(e);
        }
        fs.mkdir('./build/sites/files/rhog', function (e) {
          if (e && e.code !== 'EEXIST') {
            return next(e);
          }
          next();
        });
      });
    });
  });
});

gulp.task('build:fonts', function () {
  return gulp.src('./src/sites/fonts/*')
    .pipe(gulp.dest('./build/sites/public/fonts'));
});

gulp.task('build:haraka-config', function () {
  return gulp.src('./src/haraka/**/config/*')
    .pipe(gulp.dest('./build/haraka'));
});

gulp.task('build:html', function () {
  return gulp.src('./src/sites/views/*.html')
    .pipe(gulp.dest('./build/sites/public'));
});

gulp.task('build:images', function () {
  return gulp.src('./src/sites/images/*')
    .pipe(gulp.dest('./build/sites/public/images'));
});

gulp.task('build:sass', function () {
  var options = { precision: 10 };
  var stream = gulp.src('./src/sites/**/*.scss');
  var inProduction = process.env.NODE_ENV === 'production';
  if (!inProduction) {
    stream = stream.pipe(sourcemaps.init())
  }
  stream = stream.pipe(sass(options))
    .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(hash());
  if (!inProduction) {
    stream = stream.pipe(sourcemaps.write())
  }
  return stream.pipe(gulp.dest('./build/sites/public'))
    .pipe(hash.manifest('css-asset-hashes.json'))
    .pipe(gulp.dest('./build/sites'))
    .pipe(syncIfActive());
});

gulp.task('build:shell-scripts', function () {
  return gulp.src('./src/**/*.sh')
    .pipe(gulp.dest('./build'));
});

gulp.task('build:views', function () {
  return gulp.src('./src/**/*.ractive')
    .pipe(ractive())
    .pipe(gulp.dest('./build'))
    .pipe(syncIfActive());
});

gulp.task('build', [
  'build:es3-client',
  'build:es6-client',
  'build:es6-server',
  'build:files',
  'build:fonts',
  'build:haraka-config',
  'build:html',
  'build:images',
  'build:sass',
  'build:shell-scripts',
  'build:views'
]);

exports.sync = sync;
