/*jslint node: true*/
module.exports = {
  get: function (scene) {
    'use strict';
    scene.stage({
      name: scene.chapter.name,
      city: scene.chapter.city,
      state: scene.chapter.state,
      logo: scene.chapter.logo
    });
  }
};
