import moment from 'moment';
import event from '../../../models/event';
import ride from '../../../models/ride';
import fs from 'fs';

let inProduction = process.env.NODE_ENV === 'production';
let dest = inProduction ? process.cwd() + '/files' : process.cwd() + '/build/files';

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
        let eventVisited = {};
        let eventsByDay = {};
        for (let e of events) {
          if (eventVisited[e._id]) {
            continue;
          }
          eventVisited[e._id] = true;
          for (let [ index, day ] of e.days.entries()) {
            day.title = e.title || 'no title';
            if (e.days.length > 1) {
              day.title += ` (Day ${index + 1})`;
            }
            day._id = e._id;
            day.activity = e.activity;
            day.cancelledReason = e.cancelledReason;
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
                let zday = month.days[j];
                if (zday.formatted === d) {
                  zday.event = true;
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

  deleteForm(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    couchPromise(event.from(ac.chapterdb), 'get', ac.params.id)
      .then(value => {
        if (!value) {
          return ac.notFound();
        }
        if (value.activity === undefined) {
          value.activity = 'ride';
        }
        for (let day of value.days) {
          day.formattedDate = moment(new Date(day.year, day.month, day.date)).format('MM/DD/YYYY');
        }
        ac.render({
          data: {
            title: value.title,
            event: value,
            months: monthNames,
            legalese: ac.settings.rideLegalese
          },
          presenters: { menu: 'menu' },
          layout: 'chapter',
          view: 'delete-event'
        });
      })
      .catch(e => ac.error(e));
  },

  cancelForm(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    couchPromise(event.from(ac.chapterdb), 'get', ac.params.id)
      .then(value => {
        if (!value) {
          return ac.notFound();
        }
        if (value.activity === undefined) {
          value.activity = 'ride';
        }
        for (let day of value.days) {
          day.formattedDate = moment(new Date(day.year, day.month, day.date)).format('MM/DD/YYYY');
        }
        ac.render({
          data: {
            title: value.title,
            event: value,
            months: monthNames,
            legalese: ac.settings.rideLegalese
          },
          presenters: { menu: 'menu' },
          layout: 'chapter',
          view: 'cancel-form'
        });
      })
      .catch(e => ac.error(e));
  },

  item(ac) {
    couchPromise(event.from(ac.chapterdb), 'get', ac.params.id)
      .then(value => {
        if (!value) {
          return ac.notFound();
        }
        if (value.activity === undefined) {
          value.activity = 'ride';
        }
        let actions = {};
        if (ac.member.permissions.canManageEvents) {
          actions['Delete ' + value.activity] = `/chapter/events/${value._id}/delete-form`;
          if (!value.cancelledReason) {
            actions['Cancel ' + value.activity] = `/chapter/events/${value._id}/cancel-form`;
          }
          actions['Edit ' + value.activity] = `/chapter/events/${value._id}/edit-form`;
        }
        for (let day of value.days) {
          day.formattedDate = moment(new Date(day.year, day.month, day.date)).format('MM/DD/YYYY');
        }
        ac.render({
          data: {
            actions: actions,
            nav: { '<i class="fa fa-chevron-left"></i> Back to events': '/chapter/events' },
            shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/events' },
            title: value.title,
            event: value,
            months: monthNames,
            legalese: ac.settings.rideLegalese
          },
          presenters: { menu: 'menu' },
          layout: 'chapter'
        });
      })
      .catch(e => ac.error(e));
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

  patch(ac) {
    if (!ac.member.permissions.canManageEvents) {
      ac.redirect('/chapter/events');
    }

    event.from(ac.chapterdb).get(ac.params.id, (e, r) => {
      if (e) {
        return ac.error(e);
      }
      r.cancelledReason = ac.body.cancelledReason;
      r.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }
        ac.redirect('/chapter/events/' + ac.params.id);
      })
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
        proto.authorId = ac.member._id;
        let e = event.new(proto);
        let promise = promisify(e.to(ac.chapterdb), 'save');
        promises.push(promise);
      }
      Promise.all(promises)
        .then(() => ac.redirect('/chapter/events'))
        .catch(e => ac.error(e));
    } else {
      let promises = [];
      for (let fileKey of Object.keys(ac.files)) {
        let file = ac.files[fileKey];
        let newPath = `${dest}/${ac.account.subdomain}/${file.name}`;
        file.newPath = newPath;
        let promise = promisify(fs, 'rename', file.path, newPath);
        promises.push(promise);
      }
      Promise.all(promises)
        .then(() => {
          let proto = ac.body;
          proto.authorId = ac.member._id;
          let fileNames = [ 'garmin', 'pdf', 'est' ];
          let startDate = moment(proto.date).toDate();
          if (proto.schedule === 'range') {
            startDate = moment(proto.startDate).toDate();
          }
          for (let [i, value] of proto.days.entries()) {
            value.year = startDate.getFullYear();
            value.month = startDate.getMonth();
            value.date = startDate.getDate();
            for (let fileName of fileNames) {
              let key = `days[${i}][${fileName}]`;
              if (ac.files[key]) {
                if (!value.routeFiles) {
                  value.routeFiles = {};
                }
                value.routeFiles[fileName] = {
                  fileName: ac.files[key].originalname,
                  path: ac.files[key].newPath
                };
              }
            }
            startDate.setDate(startDate.getDate() + 1);
          }
          delete proto.startDate;
          delete proto.date;
          delete proto.numberOfDays;
          delete proto.schedule;

          ride.new(proto).to(ac.chapterdb).save(e => {
            if (e) {
              return ac.error(e);
            }
            ac.redirect('/chapter/events');
          })
        })
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

    event.from(ac.chapterdb).get(ac.params.id, (e, d) => {
      if (e) {
        return ac.redirect('/chapter/events');
      }
      d.to(ac.chapterdb).destroy(() => ac.redirect('/chapter/events'));
    })
  }
};

export default presenter;
