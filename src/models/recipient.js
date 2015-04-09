import stork from 'stork-odm';

let entity = stork.deliver('recipient', function () {
  this.string('name');
  this.string('status');
  this.string('errorMessage');
});

export default entity;
