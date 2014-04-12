/*jslint node: true*/
module.exports = {
  get: function (scene) {
    'use strict';
    scene.stage({
      year: new Date().getFullYear(),
      name: scene.chapter.name,
      sponsor: scene.chapter.sponsor
    });
  }
};
