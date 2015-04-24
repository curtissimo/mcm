var del = require('del');
var exec = require('child_process').exec;
var fs = require('fs');
var gulp = require('gulp');
var path = require('path');
var handlebars = require('handlebars');

var configPath = path.join(__dirname, './nginx-config.hbs');
var configDest = path.join(__dirname, '../dist', process.env.DOMAIN);


gulp.task('dist', [ 'dist:copy-build', 'dist:generate-nginx-config' ]);

gulp.task('dist:clean', function (next) {
  del('./dist', next);
});

gulp.task('dist:copy-build', [ 'build' ], function (next) {
  exec('cp -R ./build/ ./dist', next);
});

gulp.task('dist:generate-nginx-config', function (next) {
  fs.mkdir('./dist', function (e) {
    if (e && e.code !== 'EEXIST') {
      return next(e);
    }
    fs.readFile(configPath, 'utf8', function (err, data) {
      if (err) {
        return next(err);
      }
      var template = new handlebars.compile(data);
      fs.writeFile(configDest, template(process.env), next);
    });
  });
});
