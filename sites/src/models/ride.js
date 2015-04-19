import stork from 'stork-odm';

let ride = stork.deliver('ride', function () {
  this.string('title', { required: true });         // title
  this.string('sponsor', { required: true });       // sponsor
  this.string('attendance', { required: true });    // attendance
  this.string('authorId');                          // creator.id
  this.array('days', { required: true, minItems: 1 }); // Put everything below in this
  this.timestamps();

  this.view("byDate", (event, emitKey) => {
    for (var i = 0; i < event.days.length; i += 1) {
      emitKey([ event.days[i].year, event.days[i].month, event.days[i].date ]);
    }
  });

/*
  this.number('year', { required: true });          // from «date» or based on computation
  this.number('month', { required: true });         // from «date» or based on computation
  this.number('date', { required: true });          // from «date» or based on computation
  this.string('meetAt');                            // meetAt
  this.string('ksuAt');                             // ksuAt
  this.string('description');                       // description
  this.string('roadCaptain');                       // roadCaptain
  this.string('startFrom');                         // start
  this.string('destination');                       // destination
  this.string('destinationUrl');                    // destinationUrl
  this.string('endsAt');                            // endsAt
  this.string('cancelledReason');                   // cancelled
  this.object('routeFiles', function () {
    this.object('garmin', function () {
      this.string('fileName');
      this.string('path');
    });
    this.object('pdf', function () {
      this.string('fileName');
      this.string('path');
    });
    this.object('est', function () {
      this.string('fileName');
      this.string('path');
    });
  });
*/
});

export default ride;
