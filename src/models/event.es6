import stork from 'stork-odm';

let event = stork.deliver('event', function () {    // type === 'event' && activity !== 'ride'
  this.string('title', { required: true });         // title
  this.string('activity', { required: true });      // activity
  this.string('sponsor', { required: true });       // sponsor
  this.string('attendance', { required: true });    // attendance
  this.string('authorId');                          // creator.id
  this.array('days', { required: true, minItems: 1 }); // Put evernthing below in this
  this.timestamps();

  this.view("byDate", (event, emitKey) => {
    for (var i = 0; i < event.days.length; i += 1) {
      emitKey([ event.days[i].year, event.days[i].month, event.days[i].date ]);
    }
  });

  this.view("byDistinctDate", (event, emitKey) => {
    emitKey([ event.days[0].year, event.days[0].month, event.days[0].date ]);
  });

  this.view("byReminderDates", (event, emitKey) => {
    var i = 0;
    if (!event.cancelledReason) {
      if (event.reminders) {
        for (var j = 0; j < event.reminders.length; j += 1) {
          var day = event.reminders[j];
          var d = new Date(event.days[i].year, event.days[i].month, event.days[i].date - day);
          emitKey([d.getFullYear(), d.getMonth(), d.getDate()]);
        }
      } else {
        for (var j = 1; j < 6; j += 2) {
          var d = new Date(event.days[i].year, event.days[i].month, event.days[i].date - j);
          emitKey([d.getFullYear(), d.getMonth(), d.getDate()]);
        }
      }
    }
  });

  /*  
  this.number('year', { required: true });          // from «date» or based on computation
  this.number('month', { required: true });         // from «date» or based on computation
  this.number('date', { required: true });          // from «date» or based on computation
  this.string('meetAt');                            // meetAt
  this.string('description');                       // description
  this.string('location', { required: true });      // destination
  this.string('locationUrl');                       // destinationUrl
  this.string('endsAt');                            // endsAt
  this.string('cancelledReason');                   // cancelled
*/
});

export default event;
