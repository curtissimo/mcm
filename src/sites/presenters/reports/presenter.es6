import member from '../../../models/member';

let months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

let presenter = {
  mileage(ac) {
    let now = new Date();
    let mileageProcessFor = new Set();
    let year = parseInt(ac.query.year) || now.getFullYear();

    let month = now.getMonth() - 1;
    if (ac.query.hasOwnProperty('month')) {
      if (ac.query.month.length > 0) {
        month = parseInt(ac.query.month);
        if (isNaN(month)) {
          month = now.getMonth() - 1;
        }
      } else {
        month = -1;
      }
    }

    let years = [];
    for (let i = 2015; i <= year; i += 1) {
      years.push(i);
    }

    let from = member.from(ac.chapterdb);
    let wmm = null;
    if (month === -1) {
      wmm = from.withMonthlyMileage.bind(from, [ year, -1 ], [ year, 12 ]);
    } else {
      wmm = from.withMonthlyMileage.bind(from, [ year, month ]);
    }

    wmm((e, entities) => {
      if (e) {
        return ac.error(e);
      }

      let entries = [];
      let total = 0;
      for (let entity of entities) {
        if (mileageProcessFor.has(entity._id)) {
          continue;
        }
        mileageProcessFor.add(entity._id);
        if (entity.mileage === undefined) {
          entity.mileage = [];
        }
        for (let mileage of entity.mileage) {
          let my = mileage[0];
          let mm = mileage[1];
          if (my === year && (month === -1 || mm === month)) {
            total += mileage[2];
            entries.push({
              year: my,
              month: mm,
              miles: mileage[2],
              who: entity
            });
          }
        }
      }

      entries.sort((a, b) => {
        if (a.year < b.year) {
          return 1;
        }
        if (a.year > b.year) {
          return -1;
        }
        if (a.month < b.month) {
          return 1;
        }
        if (a.month > b.month) {
          return -1;
        }
        if (a.miles < b.miles) {
          return 1;
        }
        if (a.miles > b.miles) {
          return -1;
        }
        return 0;
      });

      ac.render({
        data: {
          entries: entries,
          year: year,
          month: month,
          total: total,
          months: months,
          years: years,
          title: "Mileage for the chapter"
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    })
  }
};

export default presenter;
