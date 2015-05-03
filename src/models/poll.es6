import stork from 'stork-odm';

export let response = stork.deliver('response', function () {
  this.string('respondantId', { required: true, minLength: 1 });
  this.number('option');
  this.timestamps();
});

export let poll = stork.deliver('poll', function () {
  this.bool('open');
  this.string('name', { required: true, minLength: 1 });
  this.array('options', { required: true, minLength: 1 });
  this.timestamps();

  this.sort([ 'createdOn' ]);
  this.composes('responses', response);
});
