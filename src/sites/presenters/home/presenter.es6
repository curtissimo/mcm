import event from '../../../models/event';
import ride from '../../../models/ride';
import doc from '../../../models/document';

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
    let today = new Date();
    let thisMonth = new Date();
    thisMonth.setDate(1);
    let nextMonth = new Date();
    nextMonth.setDate(1);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    let followingMonth = new Date();
    followingMonth.setDate(1);
    followingMonth.setMonth(followingMonth.getMonth() + 2);

    let from = [ thisMonth.getFullYear(), thisMonth.getMonth(), thisMonth.getDate() ];
    let to = [ followingMonth.getFullYear(), followingMonth.getMonth(), followingMonth.getDate() ];

    let promises = [
      couchPromise(event.from(ac.chapterdb), 'byDate', from, to),
      couchPromise(ride.from(ac.chapterdb), 'byDate', from, to),
      couchPromise(doc.from(ac.chapterdb), 'publicOnly')
    ];

    Promise.all(promises)
      .then(([events, rides, docs]) => {
        ac.render({
          data: {
            events: events,
            rides: rides,
            docs: docs,
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
