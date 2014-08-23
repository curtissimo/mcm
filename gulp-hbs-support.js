var concat, exports, fs, glob, gulp, hbs, hbsPath, hbsTask, i, path, wrap;

concat = require('gulp-concat');
fs = require('fs');
glob = require('glob');
gulp = require('gulp');
hbs = require('gulp-handlebars');
path = require('path');
wrap = require('gulp-wrapper');

module.exports = exports = {};

function makeHbsTask(templatePath) {
  'use strict';
  var destFile, destPath;
  destFile = path.basename(templatePath).replace(/hbs$/, 'js');
  destPath = path.dirname(templatePath.replace(/^hbs/, 'lib'));
  return function () {
    return gulp
      .src(exports.partials.concat(templatePath))
      .pipe(hbs())
      .pipe(wrap({
        header: function (f) {
          if (f.path.indexOf('/_') > -1) {
            return [
              'Handlebars.registerPartial("',
              path.basename(f.path, path.extname(f.path)).replace(/^\_/, ''),
              '", Handlebars.template('
            ].join('');
          }
          return [
            'this["mcm-project"]["',
            path.relative(f.cwd, f.path).replace(/^hbs/, 'lib').replace(/\.js$/, ''),
            '"] = Handlebars.template('
          ].join('');
        },
        footer: function (f) {
          if (f.path.indexOf('/_') > -1) {
            return '));\n';
          }
          return ');\n';
        }
      }))
      .pipe(concat(destFile))
      .pipe(wrap({
        header: 'var Handlebars = require("handlebars");\nmodule.exports = this["mcm-project"] = {};\n'
      }))
      .pipe(gulp.dest(destPath));
  };
}

exports.tasks = [];

/*jslint stupid: true*/
exports.partials = fs.readdirSync('./hbs/partials').map(function (p) {
  'use strict';
  return path.join('./hbs/partials', p);
});
/*jslint stupid: false*/

exports.paths = glob.sync('hbs/**/*.hbs').filter(function (f) {
  'use strict';
  return f.indexOf('/_') === -1;
});

for (i = 0; i < exports.paths.length; i += 1) {
  hbsPath = exports.paths[i];
  hbsTask = 'hbs-' + hbsPath;
  exports.tasks.push(hbsTask);
  gulp.task(hbsTask, makeHbsTask(hbsPath));
}

exports.registerWatches = function () {
  'use strict';
  var hbsPath, i;
  for (i = 0; i < exports.paths.length; i += 1) {
    hbsPath = exports.paths[i];
    gulp.watch(hbsPath, ['hbs-' + hbsPath]);
  }
  gulp.watch(exports.partials, exports.tasks);
};
