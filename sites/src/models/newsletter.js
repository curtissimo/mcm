import stork from 'stork-odm';

let newsletter = stork.deliver('newsletter', function () {
  this.number('month', { required: true, minimum: 0, maximum: 11 });  // month
  this.number('year', { required: true, minimum: 2000 });             // year
  this.string('fileName', { required: true });                        // «from _attachments»
  this.string('path', { required: true });                            // «from _attachments»
  this.string('authorId', { required: true });                        // ?
  this.string('description');                                         // ?
  this.timestamps();

  this.sort('year', 'month');
});

export default newsletter;
