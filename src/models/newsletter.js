import stork from 'stork-odm';

let newsletter = stork.deliver('newsletter', function () {
  this.number('month', { required: true, minimum: 0, maximum: 11 });
  this.number('year', { required: true, minimum: 2000 });
  this.string('fileName', { required: true });
  this.string('path', { required: true });
  this.string('authorId', { required: true });
  this.timestamps();

  this.sort('year', 'month');
});

export default newsletter;
