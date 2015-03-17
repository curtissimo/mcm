import stork from 'stork-odm';

let settings = stork.deliver('settings', function () {
  this.string('name');
  this.timestamps();
});

export default settings;
