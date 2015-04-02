import moment from 'moment';
import event from '../../models/event';

let months = [
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
    name: months[startOfMonth.getMonth()],
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
      if (error) {
        return ac.error(error);
      }
      let eventsByDay = {};
      for (let e of events) {
        let _date = e.date;
        let d = e.date = moment(new Date(e.year, e.month, e.date)).format('MM/DD/YYYY');
        if (e.year >= today.getFullYear() && ((e.month > today.getMonth() || (e.month <= today.getMonth() && _date >= today.getDate())))) {
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
          months: months,
          events: eventsByDay,
          actions: actions,
          title: 'Chapter Events'
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
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
