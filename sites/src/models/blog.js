import stork from 'stork-odm';

let blog = stork.deliver('blog', function () {
  this.string('title');
  this.string('content');
  this.timestamps();
});

export default blog;
