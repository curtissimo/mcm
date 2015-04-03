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

let dayNameMap = {
  'sunday': 0,
  'monday': 1,
  'tuesday': 2,
  'wednesday': 3,
  'thursday': 4,
  'friday': 5,
  'saturday': 6
};

function nextDayNamed(dayName) {
  let dayIndex = dayNameMap[dayName];
  let today = new Date();
  today.setDate(today.getDate() + ((dayIndex - today.getDay() + 7) % 7));
  return today;
}

function firstDayInMonth(dayName, month, year) { 
  let dayIndex = dayNameMap[dayName];
  let y = year || new Date().getFullYear();
  let m = month || new Date().getMonth();
  return new Date(y, m, 1 + (dayIndex - new Date(y, m, 1).getDay() + 7) % 7);
}

function nthDayInMonth(n, dayName, month, year) { 
  let y = year || new Date().getFullYear();
  let m = month || new Date().getMonth();
  if (n < 0) {
    m += 1;
  }
  let d = firstDayInMonth(dayName, m, y);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n * 7);
}

function* nthDaysUntil(n, dayName, until) {
  let start = nthDayInMonth(n, dayName);
  let today = new Date();
  if (start < today) {
    start = nthDayInMonth(n, dayName, today.getMonth() + 1);
  }
  while (start < until) {
    yield start;
    start.setMonth(start.getMonth() + 1);
    start = nthDayInMonth(n, dayName, start.getMonth(), start.getFullYear());
  }
}

function promisify(scope, method) {
  let args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  let fn = scope[method].bind.apply(scope[method], args);
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err) {
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

let eventFactory = {
  once: function (definition) {
    let date = moment(definition.days[0].date).toDate();
    return [{
      title: definition.title,
      activity: definition.activity,
      sponsor: definition.sponsor,
      attendance: definition.attendance,
      days: [{
        year: date.getFullYear(),
        month: date.getMonth(),
        date: date.getDate(),
        description: definition.days[0].description,
        location: definition.days[0].location,
        locationUrl: definition.days[0].locationUrl,
        meetAt: definition.days[0].meetAt,
        endsAt: definition.days[0].endsAt
       }]
    }];
  },
  weekly: function (definition) {
    let lastDay = moment(definition.weeklyEnd).toDate();
    let index = nextDayNamed(definition.weeklyWeekday);
    let dates = [];
    for (; index <= lastDay; index.setDate(index.getDate() + 7)) {
      dates.push({
        title: definition.title,
        activity: definition.activity,
        sponsor: definition.sponsor,
        attendance: definition.attendance,
        days: [{
          year: index.getFullYear(),
          month: index.getMonth(),
          date: index.getDate(),
          description: definition.days[0].description,
          location: definition.days[0].location,
          locationUrl: definition.days[0].locationUrl,
          meetAt: definition.days[0].meetAt,
          endsAt: definition.days[0].endsAt
         }]
      })
    }
    return dates;
  },
  monthly: function (definition) {
    let lastDay = moment(definition.monthlyEnd).toDate();
    let index = definition.periodicity;
    let weekday = definition.monthlyWeekday;
    let dates = [];
    for (let occurrence of nthDaysUntil(index, weekday, lastDay)) {
      dates.push({
        title: definition.title,
        activity: definition.activity,
        sponsor: definition.sponsor,
        attendance: definition.attendance,
        days: [{
          year: occurrence.getFullYear(),
          month: occurrence.getMonth(),
          date: occurrence.getDate(),
          description: definition.days[0].description,
          location: definition.days[0].location,
          locationUrl: definition.days[0].locationUrl,
          meetAt: definition.days[0].meetAt,
          endsAt: definition.days[0].endsAt
        }]
      });
    }
    return dates;
  }
};

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
          if (a.days[0].year < b.days[0].year) {
            return -1;
          }
          if (a.days[0].year > b.days[0].year) {
            return 1;
          }
          if (a.days[0].month < b.days[0].month) {
            return -1;
          }
          if (a.days[0].month > b.days[0].month) {
            return 1;
          }
          if (a.days[0].date < b.days[0].date) {
            return -1;
          }
          if (a.days[0].date > b.days[0].date) {
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
          for (let day of e.days) {
            day.title = e.title || 'no title';
            day._id = e._id;
            day.activity = e.activity;
            let d = moment([ day.year, day.month, day.date ]).format('MM/DD/YYYY');
            if (day.year >= today.getFullYear() && ((day.month > today.getMonth() || (day.month <= today.getMonth() && day.date >= today.getDate())))) {
              if (!eventsByDay[d]) {
                eventsByDay[d] = [];
              }
              eventsByDay[d].push(day);
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
      if (!r || !r.days[0].routeFiles || !r.days[0].routeFiles.est) {
        return ac.notFound();
      }
      let est = r.days[0].routeFiles.est;
      ac.file(est.path, est.fileName, ac.account.subdomain);
    });
  },

  pdf(ac) {
    ride.from(ac.chapterdb).get(ac.params.id, (e, r) => {
      if (e) {
        return ac.error(e);
      }
      if (!r || !r.days[0].routeFiles || !r.days[0].routeFiles.pdf) {
        return ac.notFound();
      }
      let pdf = r.days[0].routeFiles.pdf;
      ac.file(pdf.path, pdf.fileName, ac.account.subdomain);
    });
  },

  garmin(ac) {
    ride.from(ac.chapterdb).get(ac.params.id, (e, r) => {
      if (e) {
        return ac.error(e);
      }
      if (!r || !r.days[0].routeFiles || !r.days[0].routeFiles.garmin) {
        return ac.notFound();
      }
      let garmin = r.days[0].routeFiles.garmin;
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
    
    if (ac.body.activity !== 'ride') {
      let promises = [];
      let protos = eventFactory[ac.body.schedule](ac.body);
      for (let proto of protos) {
        let e = event.new(proto);
        let promise = promisify(e.to(ac.chapterdb), 'save');
        promises.push(promise);
      }
      Promise.all(promises)
        .then(() => ac.redirect('/chapter/events'))
        .catch(e => ac.error(e));
    }
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
