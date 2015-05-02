var autoprefixer = require('gulp-autoprefixer');
var babel = require('gulp-babel');
var basename = require('path').basename;
var del = require('del');
var dirname = require('path').dirname;
var fs = require('fs');
var glob = require('glob');
var gulp = require('gulp');
var hash = require('gulp-hash');
var join = require('path').join;
var jsmin = require('gulp-jsmin');
var newer = require('gulp-newer');
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

function newerOptionsForHash(dest, ext) {
  var re = new RegExp('\\' + ext + '$');
  var replacement = '-[^-]*' + ext;
  return {
    dest: dest,
    ext: ext,
    map: function(src) {
      try {
        var d = join(process.cwd(), dest, src);
        d = d.replace(re, replacement);
        var result = glob.sync(d);
        if (result.length === 0) {
          return '';
        }
        if (result.length === 1) {
          return join(dirname(src), basename(result[0]));
        }
        var newest = null;
        for (var i = 0; i < result.length; i += 1) {
          try {
            var stat = fs.statSync(result[i]);
          } catch (e) {
            continue;
          }
          if (newest === null || result[newest].mtime < stat.mtime) {
            newest = i;
          }
        }
        return join(dirname(src), basename(result[newest]));
      } catch (e) {
        console.error(e);
        return '';
      }
    }
  };
}

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
        });
      }, 250);
      self.push(file);
      cb();
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
    .pipe(newer(newerOptionsForHash('./build/sites/public/scripts', '.js')))
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

gulp.task('build:es6-mailer', function () {
  return gulp.src([ './src/mailer-daemon/*.es6' ])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.extname = '.js';
    }))
    .pipe(gulp.dest('./build/mailer-daemon'));
});

gulp.task('build:es6-server', function () {
  return gulp.src([ './src/**/*.es6', '!./src/sites/scripts/*.es6', '!./src/mailer-daemon/*.es6' ])
    .pipe(newer({
      dest: './build',
      ext: '.js'
    }))
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
  var stream = gulp.src('./src/sites/**/*.scss')
    .pipe(newer(newerOptionsForHash('./build/sites/public', '.css')));
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
    .pipe(newer('./build'))
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
