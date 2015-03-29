import stork from 'stork-odm';

let comment = stork.deliver('comment', function () {
  this.string('title', { required: true, minLength: 1 });
  this.string('content', { required: true, minLength: 1 });
  this.string('authorId', { required: true, minLength: 1 });
  this.timestamps();
});

export default comment;
