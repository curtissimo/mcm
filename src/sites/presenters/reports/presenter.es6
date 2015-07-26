import member from '../../../models/member';
import moment from 'moment';

let months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

let presenter = {
  membership(ac) {
    member.from(ac.chapterdb).all((e, entities) => {
      if (e) {
        return ac.error(e);
      }

      let foreverAgo = new Date(0).valueOf();
      let now = new Date();
      let oneMonth = new Date(now.valueOf());
      let twoMonth = new Date(now.valueOf());
      let threeMonth = new Date(now.valueOf());
      let forever = new Date(2200, 1, 1);
      oneMonth.setMonth(oneMonth.getMonth() + 1);
      twoMonth.setMonth(twoMonth.getMonth() + 2);
      threeMonth.setMonth(threeMonth.getMonth() + 3);
      oneMonth = oneMonth.valueOf();
      twoMonth = twoMonth.valueOf();
      threeMonth = threeMonth.valueOf();

      if (ac.query.hasOwnProperty('csv')) {
        let culled = [];
        let name = 'membership-all.csv';

        if (ac.query.hasOwnProperty('all')) {
          for (let entity of entities) {
            entity.local = moment(entity.membership.local.endDate).format('MM/DD/YYYY');
            entity.national = moment(entity.membership.national.endDate).format('MM/DD/YYYY');
            culled.push(entity);
          }
        } else {
          name = 'membershp-expired.csv';
          for (let entity of entities) {
            if (!entity.membership.local.endDate || !entity.membership.national.endDate) {
              culled.push(entity);
              continue;
            }
            entity.local = moment(entity.membership.local.endDate).format('MM/DD/YYYY');
            entity.national = moment(entity.membership.national.endDate).format('MM/DD/YYYY');
            let national = entity.membership.national.endDate.valueOf();
            let local = entity.membership.local.endDate.valueOf();
            let nationalExpired = foreverAgo <= national && national < now;
            let localExpired = foreverAgo <= local && local < now;
            if (localExpired || nationalExpired) {
              culled.push(entity);
            }
          }
        }
        let headers = {
          lastName: 'Last name',
          firstName: 'First name',
          hogNumber: 'HOG #',
          local: 'Local expiration',
          national: 'National expiration',
          phone: 'Phone',
          email: 'Email'
        };
        return ac.csv(name, culled, headers, 'lastName', 'firstName', 'hogNumber', 'local', 'national', 'phone', 'email');
      }

      let sections = [{
        title: 'Expired',
        from: foreverAgo,
        to: now,
        members: []
      },{
        title: 'Expires within the next month',
        from: now,
        to: oneMonth,
        members: []
      }, {
        title: 'Expires within the next two months',
        from: oneMonth,
        to: twoMonth,
        members: []
      }, {
        title: 'Expires within the next three months',
        from: twoMonth,
        to: threeMonth,
        members: []
      }, {
        ignoreExpired: true,
        title: 'A while off',
        from: threeMonth,
        to: forever,
        members: []
      }];

      for (let entity of entities) {
        entity.local = moment(entity.membership.local.endDate).format('MM/DD/YYYY');
        entity.localCanonical = moment(entity.membership.local.endDate).format('YYYY-MM-DD');
        entity.national = moment(entity.membership.national.endDate).format('MM/DD/YYYY');
        entity.nationalCanonical = moment(entity.membership.national.endDate).format('YYYY-MM-DD');
        let national = (entity.membership.national.endDate || '').valueOf();
        let local = (entity.membership.local.endDate || '').valueOf();
        for (let section of sections) {
          let nationalExpired = section.from <= national && national < section.to;
          let localExpired = section.from <= local && local < section.to;
          if (!section.ignoreExpired) {
            if (nationalExpired) {
              entity.nationalClass = 'is-member-expired';
            }
            if (localExpired) {
              entity.localClass = 'is-member-expired';
            }
          }
          if (nationalExpired || localExpired) {
            section.members.push(entity);
            break;
          }
        }
      }

      ac.render({
        data: {
          activeMemberCount: entities.length - sections[0].members.length,
          sections: sections,
          actions: {
            'Export expired': '/chapter/reports/membership?csv',
            'Export all': '/chapter/reports/membership?csv&all'
          },
          title: "Membership report for the chapter"
        },
        layout: 'chapter',
        presenters: { menu: 'menu' }
      });
    });
  },

  mileage(ac) {
    let mileageProcessFor = new Set();

    if (ac.query.hasOwnProperty('csv')) {
      return member.from(ac.chapterdb).withMonthlyMileage((e, entities) => {
        if (e) {
          return ac.error(e);
        }

        let mileages = [];
        for (let entity of entities) {
          if (mileageProcessFor.has(entity._id)) {
            continue;
          }
          mileageProcessFor.add(entity._id);
          if (entity.mileage === undefined) {
            continue;
          }
          for (let mileage of entity.mileage) {
            mileages.push({
              lastName: entity.lastName,
              firstName: entity.firstName,
              year: mileage[0],
              month: mileage[1],
              miles: mileage[2]
            });
          }
        }

        let headers = {
          lastName: 'Last name',
          firstName: 'firstName',
          year: 'Year',
          month: 'Month',
          miles: 'Miles'
        };

        ac.csv('mileage.csv', mileages, headers, 'year', 'month', 'miles', 'lastName', 'firstName');
      });
    }

    let now = new Date();
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
          actions: {
            'Export all': '/chapter/reports/mileage?csv'
          },
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
