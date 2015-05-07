import event from '../../../models/event';
import ride from '../../../models/ride';

// let months = [ 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
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
    ac.render({
      data: {
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
  }
};

export default presenter;
