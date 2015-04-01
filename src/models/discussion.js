import stork from 'stork-odm';
import comment from './comment';

let discussion = stork.deliver('discussion', function () {
  this.string('title', { required: true, minLength: 1 });       // subject
  this.string('content', { required: true, minLength: 1 });     // message
  this.string('authorId', { required: true, minLength: 1 });    // author.id
  this.string('category', { required: true, minLength: 1 });    // category
  this.bool('sticky');                                          // sticky
  this.timestamps();
  
  this.composes('comments', comment);
});

export default discussion;
