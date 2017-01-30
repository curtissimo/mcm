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
    let year = d.getFullYear();
    let month = d.getMonth();
    if (ac.member.mileage !== undefined) {
      for (let entry of ac.member.mileage) {
        entry.type = entry[3]? 'passenger' : 'rider';
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
    let years = [ -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0 ];
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
          mileageMonth: d.getMonth(),
          mileageYear: d.getFullYear(),
          member: ac.member,
          title: 'My Page',
          months: months,
          years: years
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
