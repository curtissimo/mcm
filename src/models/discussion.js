import stork from 'stork-odm';
import comment from './comment';

let discussion = stork.deliver('discussion', function () {
  this.string('title', { required: true, minLength: 1 });
  this.string('content', { required: true, minLength: 1 });
  this.string('authorId', { required: true, minLength: 1 });
  this.string('category', { required: true, minLength: 1 });
  this.bool('sticky');
  this.timestamps();
  
  this.composes('comments', comment);
});

export default discussion;
