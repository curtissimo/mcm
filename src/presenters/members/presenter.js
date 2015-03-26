import moment from 'moment';
import member from '../../models/member';

const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const lower = 'abcdefghijklmnopqrstuvwxyz'
const digit = '0123456789'
const all = upper + lower + digit

function rand (max) {
  return Math.floor(Math.random() * max);
}

function random (set) {
  return set[rand(set.length - 1)];
}

function generate (length, set) {
  var result = [];
  while (length--) result.push(random(set));
  return result;
}

function shuffle (arr) {
  var result = [];

  while (arr.length) {
    result = result.concat(arr.splice(rand[arr.length - 1]));
  }

  return result;
}

function password (length) {
  var result = [];

  result = result.concat(generate(1, upper));
  result = result.concat(generate(1, lower));
  result = result.concat(generate(1, digit));
  result = result.concat(generate(length - 3, all));

  return shuffle(result).join('');;
}

let presenter = {
  list(ac) {
    let data = {
      actions: {},
      title: 'View members'
    };
    if (ac.member.permissions.canManageMembers) {
      data.actions['Add a new member'] = '/chapter/members/create-form';
    }
    ac.render({
      data: data,
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  item(ac) {
    ac.render({
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  create(ac) {
    if (!ac.member.permissions.canManageMembers) {
      return ac.redirect('/chapter/members');
    }

    let localExpiration = new Date();
    localExpiration.setMonth(11);
    localExpiration.setDate(31);
    let le = moment(localExpiration).format('MM/DD/YYYY');
    let nle = moment(localExpiration).format('YYYY-MM-DD');
    let lj = moment().format('MM/DD/YYYY');
    let ljn = moment().format('YYYY-MM-DD');
    ac.render({
      data: {
        localExpiration: le,
        localExpirationNative: nle,
        localJoined: lj,
        localJoinedNative: ljn,
        password: password(8),
        title: 'Create a new member'
      },
      presenters: { menu: 'menu' },
      layout: 'chapter'
    });
  },

  post(ac) {
    if (!ac.member.permissions.canManageMembers) {
      return ac.redirect('/chapter/members');
    }
    let nationalJoined = ac.body.nationalJoined;
    let nationalExpiration = ac.body.nationalExpiration;
    let localJoined = ac.body.localJoined;
    let localExpiration = ac.body.localExpiration;

    let params = {
      firstName: ac.body.firstName,
      lastName: ac.body.lastName,
      email: ac.body.email,
      password: ac.body.password,
      hogNumber: ac.body.hogNumber,
      membership: {
        national: {
          startDate: nationalJoined ? moment(nationalJoined).toDate() : undefined,
          endDate: nationalExpiration ? moment(nationalExpiration).toDate() : undefined
        },
        local: {
          startDate: localJoined ? moment(localJoined).toDate() : undefined,
          endDate: localExpiration? moment(localExpiration).toDate() : undefined
        }
      }
    };

    let m = member.new(params);
    let validation = m.validate();
    if (validation.valid && localJoined && localExpiration) {
      
    } else {
      let errors = {};
      (validation.errors || []).forEach(error => {
        let property = error.property;
        if (property === 'membership.local.startDate') {
          property = 'localJoined';
        } else if (property === 'membership.local.endDate') {
          property = 'localExpiration';
        }
        errors[property] = error.message
      });
      let data = {
        title: 'Create a new member',
        errors: errors
      };
      Object.assign(data, ac.body);
      ac.render({
        data: data,
        view: 'create',
        presenters: { menu: 'menu' },
        layout: 'chapter'
      })
    }
  }
};

export default presenter;
