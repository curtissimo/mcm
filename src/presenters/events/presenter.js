import moment from 'moment';
import event from '../../models/event';
import ride from '../../models/ride';

let monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

function makeCalendar(startOfMonth) {
  let nextMonth = new Date(startOfMonth.valueOf());
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1);

  let month = {
    name: monthNames[startOfMonth.getMonth()],
    weeks: [[]],
    days: []
  };

  for (let i = 0; i < startOfMonth.getDay(); i += 1) {
    month.weeks[month.weeks.length - 1].push(false);
  }

  for (let i = startOfMonth; i.valueOf() < nextMonth.valueOf(); i.setDate(i.getDate() + 1)) {
    let day = {
      number: i.getDate(),
      month: i.getMonth(),
      year: i.getFullYear(),
      formatted: moment(i).format('MM/DD/YYYY')
    };
    month.weeks[month.weeks.length - 1].push(day);
    month.days.push(day);
    if (month.weeks[month.weeks.length - 1].length === 7) {
      month.weeks.push([]);
    }
  }

  for (let i = nextMonth.getDay(); i < 7; i += 1) {
    month.weeks[month.weeks.length - 1].push(false);
  }

  return month;
}

let presenter = {
  list(ac) {
    let actions = {};
    if (ac.member.permissions.canManageEvents) {
      actions['Schedule a new ride'] = '/chapter/events/create/ride';
      actions['Create an event'] = '/chapter/events/create/other';
    }

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

    let months = [ makeCalendar(thisMonth), makeCalendar(nextMonth) ];

    event.from(ac.chapterdb).byDate(from, to, (error, events) => {
      ride.from(ac.chapterdb).byDate(from, to, (error, rides) => {
        events = events.concat(rides);
        events.sort((a, b) => {
          if (a.year < b.year) {
            return -1;
          }
          if (a.year > b.year) {
            return 1;
          }
          if (a.month < b.month) {
            return -1;
          }
          if (a.month > b.month) {
            return 1;
          }
          if (a.date < b.date) {
            return -1;
          }
          if (a.date > b.date) {
            return 1;
          }
          if (a.title < b.title) {
            return -1;
          }
          if (a.title > b.title) {
            return 1;
          }
          return 0;
        });
        if (error) {
          return ac.error(error);
        }
        let eventsByDay = {};
        for (let e of events) {
          let d = moment([ e.year, e.month, e.date ]).format('MM/DD/YYYY');
          if (e.year >= today.getFullYear() && ((e.month > today.getMonth() || (e.month <= today.getMonth() && e.date >= today.getDate())))) {
            if (!eventsByDay[d]) {
              eventsByDay[d] = [];
            }
            eventsByDay[d].push(e);
          }
          for (let i = 0; i < months.length; i += 1) {
            let month = months[i];
            for (let j = 0; j < month.days.length; j += 1) {
              let day = month.days[j];
              if (day.formatted === d) {
                day.event = true;
              }
            }
          }
        }

        ac.render({
          data: {
            monthNames: monthNames,
            months: months,
            events: eventsByDay,
            actions: actions,
            title: 'Chapter Events'
          },
          presenters: { menu: 'menu' },
          layout: 'chapter'
        });
      });
    });
  },

  items(ac) {
    ac.render({
      data: {
        title: '«event name»'
      },
      presenters: { menu: 'menu' },
      layout: 'chapter',
      view: 'list'
    });
  },

  item(ac) {
    ac.render({
      data: {
        title: '«event name»'
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  est(ac) {
    ride.from(ac.chapterdb).get(ac.params.id, (e, r) => {
      if (e) {
        return ac.error(e);
      }
      if (!r || !r.routeFiles || !r.routeFiles.est) {
        return ac.notFound();
      }
      let est = r.routeFiles.est;
      ac.file(est.path, est.fileName, ac.account.subdomain);
    });
  },

  pdf(ac) {
    ride.from(ac.chapterdb).get(ac.params.id, (e, r) => {
      if (e) {
        return ac.error(e);
      }
      if (!r || !r.routeFiles || !r.routeFiles.pdf) {
        return ac.notFound();
      }
      let pdf = r.routeFiles.pdf;
      ac.file(pdf.path, pdf.fileName, ac.account.subdomain);
    });
  },

  garmin(ac) {
    ride.from(ac.chapterdb).get(ac.params.id, (e, r) => {
      if (e) {
        return ac.error(e);
      }
      if (!r || !r.routeFiles || !r.routeFiles.garmin) {
        return ac.notFound();
      }
      let garmin = r.routeFiles.garmin;
      ac.file(garmin.path, garmin.fileName, ac.account.subdomain);
    });
  },

  create(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    ac.render({
      data: {
        title: 'Create an Event',
        schedule: 'once'
      },
      presenters: { menu: 'menu' },
      layout: 'chapter',
      view: 'create-' + ac.params.type
    });
  },

  edit(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    ac.render({
      data: {
        title: 'Edit «event name»'
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    ac.error('not implemented');
  },

  put(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    ac.error('not implemented');
  },

  delete(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    ac.error('not implemented');
  }
};

export default presenter;
