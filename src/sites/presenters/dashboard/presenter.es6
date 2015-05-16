import moment from 'moment';
import event from '../../../models/event';
import ride from '../../../models/ride';
import blog from '../../../models/blog';

let months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

function nullLen(s) {
  if (s) {
    return s.trim().length;
  }
  return 0;
}

let presenter = {
  get(ac) {
    if (ac.member.address) {
      let len = nullLen(ac.member.address.street1)
              + nullLen(ac.member.address.street2)
              + nullLen(ac.member.address.city)
              + nullLen(ac.member.address.state)
              + nullLen(ac.member.address.zip);
      if (len === 0) {
        ac.member.address = null;
      }
    }
    for (let achievement of (ac.member.achievements || [])) {
      if (achievement.on) {
        achievement.toString = () => {
          return `${achievement.description} - ${months[achievement.on[1]]} ${achievement.on[0]}`;
        };
      } else if (achievement.hasOwnProperty('from') && achievement.to) {
        achievement.toString = () => {
          return `${achievement.description} ${achievement.from} - ${achievement.to}`;
        };
      } else {
        achievement.toString = () => {
          return `${achievement.description} ${achievement.from}`;
        };
      }
    }
    let d = new Date();
    d.setMonth(d.getMonth() - 1);
    let year = d.getFullYear();
    let month = d.getMonth();
    let hasRecordedMileage = false;
    if (ac.member.mileage !== undefined) {
      for (let entry of ac.member.mileage) {
        if (entry[0] === year && entry[1] === month) {
          hasRecordedMileage = true;
          break;
        }
      }
    } else {
      ac.member.mileage = [];
    }
    ac.member.mileage.sort(function (a, b) {
      if (a[0] < b[0]) {
        return 1;
      }
      if (a[0] > b[0]) {
        return -1;
      }
      if (a[1] < b[1]) {
        return 1;
      }
      if (a[1] > b[1]) {
        return -1;
      }
      return 0;
    });
    let from = [ ac.member._id ];
    let to = [ ac.member._id, '3' ];
    blog.from(ac.chapterdb).byAuthorAndDate(from, to, (e, entities) => {
      if (e) {
        return ac.error(e);
      }
      for (let entity of entities) {
        entity.createdOn = moment(entity.createdOn).format('MMM DD, YYYY');
      }
      ac.render({
        data: {
          blogs: entities,
          hasRecordedMileage: hasRecordedMileage,
          mileageMonth: months[d.getMonth()],
          mileageYear: d.getFullYear(),
          member: ac.member,
          title: 'My Page',
          months: months
        },
        presenters: {
          menu: 'menu'
        },
        layout: 'chapter'
      });
    });
  }
};

export default presenter;
