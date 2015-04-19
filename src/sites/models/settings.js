import stork from 'stork-odm';

let settings = stork.deliver('settings', function () {
  this.string('name');
  this.string('rideLegalese');
  this.timestamps();
});

export default settings;
