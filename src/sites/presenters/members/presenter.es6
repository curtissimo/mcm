import moment from 'moment';
import fs from 'fs';
import member from '../../../models/member';
import blog from '../../../models/blog';
import { postMailDirective } from '../../../mailUtils';

const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lower = 'abcdefghijklmnopqrstuvwxyz';
const digit = '0123456789';
const all = upper + lower + digit;
const membershipTypes = [
  { name: 'Full', abbreviation: 'F' },
  { name: 'Full Lifetime', abbreviation: 'L' },
  { name: 'Associate', abbreviation: 'A' },
  { name: 'Associate Lifetime', abbreviation: 'B' }
];
const usStates = [
    { name: '', abbreviation: 'Not set' },
    { name: 'ALABAMA', abbreviation: 'AL'},
    { name: 'ALASKA', abbreviation: 'AK'},
    { name: 'AMERICAN SAMOA', abbreviation: 'AS'},
    { name: 'ARIZONA', abbreviation: 'AZ'},
    { name: 'ARKANSAS', abbreviation: 'AR'},
    { name: 'CALIFORNIA', abbreviation: 'CA'},
    { name: 'COLORADO', abbreviation: 'CO'},
    { name: 'CONNECTICUT', abbreviation: 'CT'},
    { name: 'DELAWARE', abbreviation: 'DE'},
    { name: 'DISTRICT OF COLUMBIA', abbreviation: 'DC'},
    { name: 'FEDERATED STATES OF MICRONESIA', abbreviation: 'FM'},
    { name: 'FLORIDA', abbreviation: 'FL'},
    { name: 'GEORGIA', abbreviation: 'GA'},
    { name: 'GUAM', abbreviation: 'GU'},
    { name: 'HAWAII', abbreviation: 'HI'},
    { name: 'IDAHO', abbreviation: 'ID'},
    { name: 'ILLINOIS', abbreviation: 'IL'},
    { name: 'INDIANA', abbreviation: 'IN'},
    { name: 'IOWA', abbreviation: 'IA'},
    { name: 'KANSAS', abbreviation: 'KS'},
    { name: 'KENTUCKY', abbreviation: 'KY'},
    { name: 'LOUISIANA', abbreviation: 'LA'},
    { name: 'MAINE', abbreviation: 'ME'},
    { name: 'MARSHALL ISLANDS', abbreviation: 'MH'},
    { name: 'MARYLAND', abbreviation: 'MD'},
    { name: 'MASSACHUSETTS', abbreviation: 'MA'},
    { name: 'MICHIGAN', abbreviation: 'MI'},
    { name: 'MINNESOTA', abbreviation: 'MN'},
    { name: 'MISSISSIPPI', abbreviation: 'MS'},
    { name: 'MISSOURI', abbreviation: 'MO'},
    { name: 'MONTANA', abbreviation: 'MT'},
    { name: 'NEBRASKA', abbreviation: 'NE'},
    { name: 'NEVADA', abbreviation: 'NV'},
    { name: 'NEW HAMPSHIRE', abbreviation: 'NH'},
    { name: 'NEW JERSEY', abbreviation: 'NJ'},
    { name: 'NEW MEXICO', abbreviation: 'NM'},
    { name: 'NEW YORK', abbreviation: 'NY'},
    { name: 'NORTH CAROLINA', abbreviation: 'NC'},
    { name: 'NORTH DAKOTA', abbreviation: 'ND'},
    { name: 'NORTHERN MARIANA ISLANDS', abbreviation: 'MP'},
    { name: 'OHIO', abbreviation: 'OH'},
    { name: 'OKLAHOMA', abbreviation: 'OK'},
    { name: 'OREGON', abbreviation: 'OR'},
    { name: 'PALAU', abbreviation: 'PW'},
    { name: 'PENNSYLVANIA', abbreviation: 'PA'},
    { name: 'PUERTO RICO', abbreviation: 'PR'},
    { name: 'RHODE ISLAND', abbreviation: 'RI'},
    { name: 'SOUTH CAROLINA', abbreviation: 'SC'},
    { name: 'SOUTH DAKOTA', abbreviation: 'SD'},
    { name: 'TENNESSEE', abbreviation: 'TN'},
    { name: 'TEXAS', abbreviation: 'TX'},
    { name: 'UTAH', abbreviation: 'UT'},
    { name: 'VERMONT', abbreviation: 'VT'},
    { name: 'VIRGIN ISLANDS', abbreviation: 'VI'},
    { name: 'VIRGINIA', abbreviation: 'VA'},
    { name: 'WASHINGTON', abbreviation: 'WA'},
    { name: 'WEST VIRGINIA', abbreviation: 'WV'},
    { name: 'WISCONSIN', abbreviation: 'WI'},
    { name: 'WYOMING', abbreviation: 'WY' }
];

let inProduction = process.env.NODE_ENV === 'production';
let dest = inProduction ? process.cwd() + '/../../files' : process.cwd() + '/build/sites/files';

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

function formatDate(s) {
  let d = moment(s);
  if (d.isValid()) {
    return d.format('YYYY-MM-DD');
  }
  return '';
}

function formatPhone(s) {
  if (s.match(/\d{9}/)) {
    return s.substring(0, 3) + '-' + s.substring(3, 6) + '-' + s.substring(6);
  }
  return s;
}

function toDate(s) {
  let d = moment(s, 'YYYY-MM-DD');
  if (d.isValid() && d.year() > 1999) {
    return d.toDate();
  } else {
    d = moment(s, 'MM/DD/YYYY');
    if (d.isValid()) {
      return d.toDate();
    }
  }
  return null;
}

let presenter = {
  list(ac) {
    let data = {
      letters: upper,
      title: 'View members'
    };
    let aMonthAgo = moment();
    aMonthAgo.subtract(1, 'month');
    if (ac.member.permissions.canManageMembers) {
      data.actions = {
        ['Add a new member']: '/chapter/members/create-form'
      };
    }
    let organizedMembers = [];
    member.from(ac.chapterdb).all(function(e, members) {
      if (e) {
        return ac.error(e);
      }
      let sectionKeys = [];
      let memberIndex = 0;
      for (let i = 0; i < lower.length; i += 1) {
        let letter = lower[i];
        let currentSection = [];
        let currentSectionKey = [];
        organizedMembers.push(currentSection);
        while (memberIndex < members.length && members[memberIndex].lastName[0].toLowerCase() == letter) {
          let m = members[memberIndex];
          m.key = `|${m.firstName.toLowerCase()}|${m.lastName.toLowerCase()}`;
          currentSectionKey.push(m.key);
          memberIndex += 1;
          if (!ac.member.permissions.canManageMembers && m.private) {
            continue;
          }
          currentSection.push(m);
          for (let achievement of (m.achievements || [])) {
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
          if (m.membership && m.membership.local && m.membership.local.startDate) {
            let startDate = moment(m.membership.local.startDate);
            if (startDate > aMonthAgo) {
              m.isNewMember = true;
            }
          }
        }
        sectionKeys.push(currentSectionKey.join(''));
      }
      data.members = organizedMembers;
      data.sectionKeys = sectionKeys;
      ac.render({
        data: data,
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  item(ac) {
    member.from(ac.chapterdb).withBlogs(ac.params.id, function (e, m) {
      if (e) {
        return ac.error(e);
      }
      for (let achievement of (m.achievements || [])) {
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
      if (m.blogs === undefined) {
        m.blogs = [];
      }
      for (let blog of m.blogs) {
        if (blog && blog.createdOn) {
          blog.createdOn = moment(blog.createdOn).format('dddd MMM DD, YYYY');
          blog.content = blog.content.replace(/\n/g, '<br>');
        }
      }
      m.blogs.sort((a, b) => {
        if (a.createdOn.valueOf() < b.createdOn.valueOf()) {
          return 1;
        }
        if (a.createdOn.valueOf() > b.createdOn.valueOf()) {
          return -1;
        }
        return 0;
      });
      let editKey = `Edit ${m.firstName}`;
      let editValue = `/chapter/members/${m._id}/edit-form`;
      let deleteKey = `Delete ${m.firstName}`;
      let deleteValue = `/chapter/members/${m._id}/delete-form`;
      let actions = null;
      if (ac.member.permissions.canManageMembers) {
        actions = {
          [editKey]: editValue,
          [deleteKey]: deleteValue
        };
      }
      ac.render({
        data: {
          nav: { '<i class="fa fa-chevron-left"></i> Back to members': '/chapter/members' },
          shortnav: { '<i class="fa fa-chevron-left"></i>': '/chapter/members' },
          actions: actions,
          member: m,
          viewer: ac.member,
          title: m.nickName || `${m.firstName} ${m.lastName}`
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
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

  delete(ac) {

  },

  photo(ac) {
    member.from(ac.chapterdb).get(ac.params.id, function (e, member) {
      if (e) {
        return ac.error(e);
      }
      if (member.photoPath) {
        return ac.binary(member.photoPath, member.photoPath, ac.account.subdomain);
      }
      ac.redirect('/images/unknown-user.jpg');
    });
  },

  patchPhoto(ac) {
    let file = ac.files.photo;
    let newPath = `${dest}/${ac.account.subdomain}/${file.name}`;
    file.newPath = newPath;
    promisify(fs, 'rename', file.path, newPath)
      .then(() => {
        member.from(ac.chapterdb).get(ac.params.id, (e, m) => {
          if (e) {
            return ac.error(e);
          }
          promisify(fs, 'unlink', m.photoPath)
            .catch(e => console.error(e));
          m.photoPath = newPath;
          m.to(ac.chapterdb).save(saveError => {
            if (saveError) {
              return ac.error(saveError);
            }
            ac.redirect(ac.referer);
          })
        });
      })
      .catch(e => ac.error(e));
  },

  patchEmailPreferences(ac) {
    if (ac.member._id !== ac.params.id) {
      return ac.redirect('/chapter/dashboard');
    }

    if (ac.body.emailPreferences === undefined) {
      ac.body.emailPreferences = {};
    }
    ac.member.emailPreferences.getCalendarReminders = !!ac.body.emailPreferences.getCalendarReminders;
    ac.member.emailPreferences.getDiscussions = !!ac.body.emailPreferences.getDiscussions;

    ac.member.to(ac.chapterdb).save(e => {
      if (e) {
        return ac.error(e);
      }

      ac.redirect('/chapter/dashboard');
    });
  },

  patchPrivacy(ac) {
    if (ac.member._id !== ac.params.id) {
      return ac.redirect('/chapter/dashboard');
    }

    if (ac.body.privacy === undefined) {
      ac.body.privacy = {};
    }
    ac.member.private = !!ac.body.private;
    ac.member.privacy.showEmail = !!ac.body.privacy.showEmail;
    ac.member.privacy.showPhone = !!ac.body.privacy.showPhone;
    ac.member.privacy.showAddress = !!ac.body.privacy.showAddress;

    ac.member.to(ac.chapterdb).save(e => {
      if (e) {
        return ac.error(e);
      }

      ac.redirect('/chapter/dashboard');
    });
  },

  patchMileage(ac) {
    if (ac.member._id !== ac.params.id) {
      return ac.redirect('/chapter/dashboard');
    }

    if (ac.member.mileage === undefined) {
      ac.member.mileage = [];
    }
    let d = new Date();
    d.setMonth(d.getMonth() - 1);
    ac.member.mileage.push([ d.getFullYear(), d.getMonth(), parseInt(ac.body.mileage) ]);

    ac.member.to(ac.chapterdb).save(e => {
      if (e) {
        return ac.error(e);
      }

      ac.redirect('/chapter/dashboard');
    });
  },

  edit(ac) {
    if (!ac.member.permissions.canManageMembers && ac.member._id !== ac.params.id) {
      return ac.redirect('/chapter/members');
    }

    member.from(ac.chapterdb).get(ac.params.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      entity.birthDate = formatDate(entity.birthDate);
      entity.membership.national.startDate = formatDate(entity.membership.national.startDate);
      entity.membership.national.endDate = formatDate(entity.membership.national.endDate);
      entity.membership.local.startDate = formatDate(entity.membership.local.startDate);
      entity.membership.local.endDate = formatDate(entity.membership.local.endDate);
      if (entity.membership.national.type === 'L') {
        entity.membership.national.endDate = 'never';
      }

      if (!entity.address) {
        entity.address = {};
      }
      if (!entity.address.state) {
        entity.address.state = 'TX';
      }

      ac.render({
        data: {
          canManageMembers: ac.member.permissions.canManageMembers,
          member: entity,
          states: usStates,
          membershipTypes: membershipTypes,
          title: `Edit ${entity.firstName} ${entity.lastName}`
        },
        presenters: { menu: 'menu' },
        layout: 'chapter'
      });
    });
  },

  put(ac) {
    if (!ac.member.permissions.canManageMembers && ac.member._id !== ac.params.id) {
      return ac.redirect('/chapter/members');
    }

    member.from(ac.chapterdb).get(ac.params.id, (e, entity) => {
      if (e) {
        return ac.error(e);
      }

      Object.assign(entity, ac.body);

      entity.phone = formatPhone(entity.phone);
      entity.mobile = formatPhone(entity.mobile);

      entity.birthDate = toDate(entity.birthDate);
      entity.membership.national.startDate = toDate(entity.membership.national.startDate);
      entity.membership.local.startDate = toDate(entity.membership.local.startDate);
      entity.membership.local.endDate = toDate(entity.membership.local.endDate);
      if (entity.membership.national.type === 'L') {
        entity.membership.national.endDate = new Date(2020, 1, 1);
      } else {
        entity.membership.national.endDate = toDate(entity.membership.national.endDate);
      }
      if (entity.address.state.length > 2) {
        entity.address.state = '';
      }

      entity.to(ac.chapterdb).save(saveError => {
        if (saveError) {
          return ac.error(saveError);
        }

        if (ac.member.permissions.canManageMembers) {
          return ac.redirect(`/chapter/members/${ac.params.id}`);
        }

        ac.redirect('/chapter/dashboard');
      })
    });
  },

  createBlog(ac) {
    if (ac.member._id !== ac.params.id) {
      return ac.redirect('/chapter/dashboard');
    }

    let entity = blog.new(ac.body.blog);
    entity['$member_blogs_id'] = ac.member._id;
    entity['$member_blogs_order'] = new Date().valueOf();
    entity.to(ac.chapterdb).save(e => {
      if (e) {
        return ac.error(e);
      }
      ac.redirect('/chapter/dashboard');
    });
  },

  destroy(ac) {
    if (!ac.member.permissions.canManageMembers) {
      return ac.redirect('/chapter/members');
    }

    entity.from(ac.chapterdb).get((e, thing) => {
      if (e) {
        return ac.error(e);
      }
      thing.to(ac.chapterdb).destroy(e => {
        if (e) {
          return ac.error(e);
        }
        ac.redirect('/chapter/members');
      });
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
      m.to(ac.chapterdb).save(e => {
        if (e) {
          return ac.error(e);
        }

        let host = ac.account.domain;
        if (!host) {
          host = `${ac.account.subdomain}.ismymc.com`;
        }
        let directive = {
          chapterName: ac.settings.name,
          host: host,
          password: m.password
        };
        ac.renderEmails('welcome', directive)
          .then(() => {
            postMailDirective('mcm-single-mail', {
              to: `"${m.firstName} ${m.lastName}" <${m.email}>`,
              from: `"${ac.settings.name}" <no-reply@${host}>`,
              subject: `Welcome to ${ac.settings.name}`,
              text: ac.mails.text,
              html: ac.mails.html
            });
          })
          .then(() => ac.redirect('/chapter/members'))
          .catch(e => ac.error(e));
      });
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
      });
    }
  }
};

export default presenter;
