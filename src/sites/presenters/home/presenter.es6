import event from '../../../models/event';
import ride from '../../../models/ride';
import doc from '../../../models/document';
import { text2html } from '../../../mailUtils';

let months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

function couchPromise(scope, method) {
  let args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  let fn = scope[method].bind.apply(scope[method], args);
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err && err.status_code !== 404) {
        return bad(err);
      }
      try {
        good(value);
      } catch (e) {
        bad(e);
      }
    });
  })
}

let presenter = {
  get(ac) {
    ac.addStylesheet('area');

    let today = new Date();
    let thisMonth = new Date();
    thisMonth.setDate(1);
    let nextMonth = new Date();
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    let followingMonth = new Date();
    followingMonth.setDate(1);
    followingMonth.setMonth(followingMonth.getMonth() + 2);

    let from = [ today.getFullYear(), today.getMonth(), today.getDate() ];
    let to = [ followingMonth.getFullYear(), followingMonth.getMonth(), followingMonth.getDate() ];

    let promises = [
      couchPromise(event.from(ac.chapterdb), 'byDistinctDate', from, to),
      couchPromise(ride.from(ac.chapterdb), 'byDistinctDate', from, to),
      couchPromise(doc.from(ac.chapterdb), 'publicOnly')
    ];

    Promise.all(promises)
      .then(([events, rides, docs]) => {
        events = events.filter(e => e.attendance !== 'member');
        rides = rides.filter(e => e.attendance !== 'member');

        for (let evt of events) {
          Object.assign(evt, evt.days[0]);
          evt.monthName = months[evt.month];
          if (evt.activity) {
            evt.activity = evt.activity[0].toUpperCase() + evt.activity.substring(1);
            evt.description = text2html(evt.description);
          }
        }

        for (let r of rides) {
          Object.assign(r, r.days[0]);
          r.monthName = months[r.month];
          r.description = text2html(r.description);
        }

        ac.render({
          data: {
            member: ac.member,
            events: events,
            rides: rides,
            docs: docs,
            settings: ac.settings,
            title: ac.settings.name
          },
          view: 'default',
          layout: 'public'
        });
      })
      .catch(e => {
        console.error(e, e.stack);
        ac.error(e);
      })
  },

  photo(ac) {
    ac.binary(ac.settings.photo, ac.settings.photo, ac.account.subdomain);
  }
};

export default presenter;
