import stork from 'stork-odm';

let comment = stork.deliver('comment', function () {
  this.string('title', { required: true, minLength: 1 });     // subject
  this.string('content', { required: true, minLength: 1 });   // message
  this.string('authorId', { required: true, minLength: 1 });  // author.id
  this.timestamps();
});

export default comment;
