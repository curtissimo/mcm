/*jslint node: true*/
var odm, models, path;

odm = require('stork-odm');
path = require('path');
models = [];

[ 'member', 'page' ].map(function (model) {
  'use strict';
  models.push(require(path.join('..', 'models', model)));
});

module.exports = {
  get: function (scene) {
    'use strict';
    var id, name;

    id = scene.param('id');
    name = scene.param('name');

    odm.from(scene.chapterdb).get(models, id, function (e, entity) {
      if (e) {
        return scene.cut(e);
      }

      if (scene.md5 === entity[name].digest) {
        return scene.seen();
      }

      scene.run(entity[name].type, entity[name].pipeFrom(scene.chapterdb), entity[name].digest);
    });
  }
};
