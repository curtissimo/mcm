import stork from 'stork-odm';

let event = stork.deliver('event', function () {    // type === 'event' && activity !== 'ride'
  this.string('title', { required: true });         // title
  this.string('activity', { required: true });      // activity
  this.string('sponsor', { required: true });       // sponsor
  this.string('attendance', { required: true });    // attendance
  this.number('year', { required: true });          // from «date» or based on computation
  this.number('month', { required: true });         // from «date» or based on computation
  this.number('date', { required: true });          // from «date» or based on computation
  this.string('meetAt');                            // meetAt
  this.string('description');                       // description
  this.string('location', { required: true });      // destination
  this.string('locationUrl');                       // destinationUrl
  this.string('endsAt');                            // endsAt
  this.string('authorId');                          // creator.id
  this.timestamps();

  this.view('byDate', function (event, emitKey) {
    emitKey([ event.year, event.month, event.date ]);
  });
});

export default event;
