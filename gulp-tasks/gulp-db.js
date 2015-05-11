require('babel/polyfill');
var fs = require('fs');
var nano = require('nano');
var crypto = require('crypto');
var html2text = null;
try {
html2text = require('../build/mailUtils').html2text;
} catch (e) {}
var lookup = {};

Promise.hash = function (o) {
  var keys = Object.keys(o);
  var symbols = Object.getOwnPropertySymbols(o);
  var values = [];
  for (var i = 0; i < keys.length; i += 1) {
    values.push(o[keys[i]]);
  }
  return new Promise(function (good, bad) {
    Promise.all(values)
      .then(function (result) {
        var resolved = {};
        for (var i = 0; i < keys.length; i += 1) {
          resolved[keys[i]] = result[i];
        }
        for (var i = 0; i < symbols.length; i += 1) {
          resolved[symbols[i]] = o[symbols[i]];
        }
        good(resolved);
      })
      .catch(function (error) {
        bad(error);
      });
  });
}

function initModels() {
  if (Object.keys(lookup).length > 0) {
    return;
  }

  lookup = {
    account: null,
    settings: null,
    blog: null,
    member: null,
    newsletter: null,
    document: null,
    discussion: null,
    comment: null,
    event: null,
    page: null,
    ride: null,
    email: null
  };

  var keys = Object.keys(lookup);
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    lookup[key] = require('../build/models/' + key);
  }

  lookup.poll = require('../build/models/poll').poll;
  lookup.response = require('../build/models/poll').response;
}

exports.initialize = function (gulp, db) {

var chapterName = 'rhog';
var masterurl = db + '/mcm-master';
var chapterurl = db + '/' + chapterName;
var bakurl = db + '/' + chapterName + '-bak';

var db = nano(masterurl);
var dbms = nano(db.config.url);
var bakdb = nano(bakurl);
var chapterdb = nano(chapterurl);

function promisify(scope, method) {
  var args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  var fn = scope[method].bind.apply(scope[method], args);
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

function getAttachment(id, oldName, cb) {
  bakdb.attachment.get(id, oldName, function (err, body) {
    if (err) {
      return cb(err);
    }
    var suffix = oldName.substring(oldName.lastIndexOf('.') - 1);
    var md5 = crypto.createHash('md5');
    md5.update(body);
    var newName = md5.digest('hex') + suffix;
    fs.writeFile('./src/sites/files/rhog/' + newName, body, function (err2) {
      if (err2) {
        return cb(err2);
      }
      cb(null, newName);
    });
  });
}

var att = { getAttachment: getAttachment };

function sync() {
  return Promise.all([
    promisify(lookup.account.to(masterurl), 'sync'),
    promisify(lookup.settings.to(chapterurl), 'sync'),
    promisify(lookup.blog.to(chapterurl), 'sync'),
    promisify(lookup.member.to(chapterurl), 'sync'),
    promisify(lookup.newsletter.to(chapterurl), 'sync'),
    promisify(lookup.document.to(chapterurl), 'sync'),
    promisify(lookup.discussion.to(chapterurl), 'sync'),
    promisify(lookup.comment.to(chapterurl), 'sync'),
    promisify(lookup.event.to(chapterurl), 'sync'),
    promisify(lookup.page.to(chapterurl), 'sync'),
    promisify(lookup.ride.to(chapterurl), 'sync'),
    promisify(lookup.email.to(chapterurl), 'sync'),
    promisify(lookup.poll.to(chapterurl), 'sync'),
    promisify(lookup.response.to(chapterurl), 'sync')
  ]);
}

function setUp() {
  return promisify(dbms.db, 'destroy', db.config.db)
    .then(function () { return promisify(dbms.db, 'create', db.config.db); })
    .then(function () { return promisify(dbms.db, 'destroy', chapterName); })
    .then(function () { return promisify(dbms.db, 'create', chapterName); })
    .then(function () { return sync(); });
}

gulp.task('db:files-dir', function (next) {
  fs.mkdir('./src', function (e) {
    if (e && e.code !== 'EEXIST') {
      return next(e);
    }
    fs.mkdir('./src/sites', function (e) {
      if (e && e.code !== 'EEXIST') {
        return next(e);
      }
      fs.mkdir('./src/sites/files', function (e) {
        if (e && e.code !== 'EEXIST') {
          return next(e);
        }
        fs.mkdir('./src/sites/files/rhog', function (e) {
          if (e && e.code !== 'EEXIST') {
            return next(e);
          }
          next();
        });
      });
    });
  });
});

gulp.task('db:migrate', [ 'db:files-dir', 'build:es6-server' ], function (cb) {
  initModels();

  var nameMap = {
    topic: 'discussion',
    comment: 'comment'
  };

  var converters = {
    page: {
      map: function (page) {
        return {
          _id: page._id,
          title: page.title,
          order: page.order,
          sections: page.sections,
          hidden: !!page.hidden
        }
      },
      name: 'page',
      createdDate: 'does-not-exist'
    },
    topic: {
      map: function (topic) {
        return {
          _id: topic._id,
          title: topic.subject,
          content: html2text(topic.message),
          authorId: topic.author.id,
          category: topic.category,
          sticky: topic.sticky
        };
      },
      name: 'discussion',
      createdDate: 'enteredDate'
    },
    comment: {
      map: function (comment) {
        return {
          _id: comment._id,
          title: comment.subject,
          content: html2text(comment.message),
          authorId: comment.author.id,
          '$discussion_comments_id': comment.topic,
          '$discussion_comments_order': new Date(comment.enteredDate).valueOf()
        }
      },
      name: 'comment',
      createdDate: 'enteredDate'
    },
    member: {
      map: function (member) {
        if (member.title === 'Webmaster') {
          member.canAdminNewsletters = true;
          member.canAdminChapterInfo = true;
          member.canAdminCalendar = true;
          member.canAdminSecurity = true;
          member.canManagePublicDocuments = true;
          member.canManagePrivateDocuments = true;
          member.canAdminDiscussions = true;
          member.canAdminMembers = true;
          member.canManageRoadCaptains = true;
          member.canManageEmails = true;
          member.canManageOfficers = true;
          member.canManagePolls = true;
        } else if (member.title === 'Director' || member.title === 'Assistant Director') {
          member.canAdminNewsletters = true;
          member.canAdminChapterInfo = true;
          member.canAdminCalendar = true;
          member.canAdminSecurity = true;
          member.canManagePublicDocuments = true;
          member.canManagePrivateDocuments = true;
          member.canAdminDiscussions = true;
          member.canAdminMembers = true;
          member.canManageRoadCaptains = true;
          member.canManageOfficers = true;
          member.canManagePolls = true;
        } else if (member.title === 'Newsletter Editor') {
          member.canAdminNewsletters = true;
        } else if (member.title === 'Head Road Captain') {
          member.canManageRoadCaptains = true;
          member.canManagePolls = true;
        } else if (member.title === 'Activities Officer') {
          member.canAdminCalendar = true;
        }

        member.phoneNbr = member.phoneNbr.trim().replace(/,/g, '');
        member.city = member.city.trim().replace(/,/g, '');
        member.state = member.state.trim().replace(/,/g, '').toUpperCase();
        member.zip = member.zip || '';
        if (member.phoneNbr === '000-000-0000' || member.phoneNbr.length === 0) {
          member.phoneNbr = null;
        }
        if (member.cellPhoneNbr === '') {
          member.cellPhoneNbr = null;
        }
        if (member.city.replace(/ /g, '').toLowerCase() === 'sugarland') {
          member.city = 'Sugar Land';
        }
        if (member.city.replace(/ /g, '').toLowerCase() === 'missouricity') {
          member.city = 'Missouri City';
        }
        if (member.city.replace(/ /g, '').toLowerCase() === 'missoricity') {
          member.city = 'Missouri City';
        }
        if (member.city.replace(/ /g, '').toLowerCase() === 'houston') {
          member.city = 'Houston';
        }
        if (member.city.replace(/ /g, '').toLowerCase() === 'rosenburg') {
          member.city = 'Rosenberg';
        }
        if (member.city === 'Felshear') {
          member.city = 'Fulshear';
        }
        if (member.city === 'Suger Land') {
          member.city = 'Sugar Land';
        }
        if (member.address1 && member.address1.toUpperCase().startsWith('X')) {
          member.address1 = null;
        }
        if (member.city.toUpperCase().startsWith('X') || member.city.length === 0) {
          member.city = null;
        }
        if (member.state.toUpperCase().startsWith('X') || member.state.length === 0) {
          member.state = null;
        }
        if (member.zip === '00000' || member.zip.length === 0) {
          member.zip = null;
        } else {
          member.zip = member.zip.toString();
        }
        if (member.officerEmail) {
          var email = member.officerEmail;
          email = email.substring(0, email.lastIndexOf('@'));
          member.officerEmail = email;
        }
        return {
          _id: member._id,
          firstName: member.firstName,
          middleInitial: member.middleInitial,
          lastName: member.lastName,
          nickName: member.nickName,
          email: member.email.toLowerCase(),
          password: member.password,
          hogNumber: member.hogNumber.toUpperCase().replace(/ /g, ''),
          mobile: member.cellPhoneNbr,
          phone: member.phoneNbr,
          sex: member.sex,
          private: member.privateName,
          birthDate: member.birthDate,
          isRoadCaptain: member.isRoadCaptain,
          isLohMember: member.lohMember,
          title: member.title,
          officerInbox: member.officerEmail,
          motorcycle: {
            model: member.motorcycleModel,
            year: (member.motorcycleYear - 0) || null
          },
          spouse: {
            firstName: member.spouseFirstName,
            lastName: member.spouseLastName
          },
          emergencyContact: {
            name: member.emergContact,
            mobile: member.emergPhoneNbr,
            phone: member.emergPhoneNbr2
          },
          address: {
            street1: member.address1,
            street2: member.address2,
            city: member.city,
            state: member.state,
            zip: member.zip
          },
          membership: {
            national: {
              type: member.typeMembership,
              startDate: member.nationalHogMemberSinceDate,
              endDate: member.nationalHogExpirationDate
            },
            local: {
              startDate: member.memberSinceDate,
              endDate: member.expirationDate
            }
          },
          permissions: {
            canManageNewsletters: !!member.canAdminNewsletters,
            canManageSettings: !!member.canAdminChapterInfo,
            canManageEvents: !!member.canAdminCalendar,
            canManagePermissions: !!member.canAdminSecurity,
            canManagePublicDocuments: !!member.canManagePublicDocuments,
            canManagePrivateDocuments: !!member.canManagePrivateDocuments,
            canManageDiscussions: !!member.canAdminDiscussions,
            canManageMembers: !!member.canAdminMembers,
            canManageRoadCaptains: !!member.canManageRoadCaptains,
            canManageEmails: !!member.canManageEmails,
            canManagePolls: !!member.canManagePolls,
            canManageOfficers: !!member.canManageOfficers
          },
          emailPreferences: {
            getCalendarReminders: member.calReminderEmail,
            getDiscussions: member.discussEmail,
            getNewsletter: member.newsLetterEmail
          },
          privacy: {
            showEmail: !member.privateEmail,
            showPhone: !member.privatePhone,
            showAddress: !member.privateAddress
          }
        }
      },
      name: 'member',
      createdDate: 'not-there'
    },
    newsletter: {
      map: function (newsletter, cb) {
        var month = newsletter.month;
        if (month < 10) {
          month = '0' + month;
        }
        if (newsletter.year === 2014 && newsletter.month === 11) {
          month = 10;
        }
        var attachmentName = newsletter.year + '-' + month + '.pdf';
        getAttachment(newsletter._id, attachmentName, function (err, newName) {
          if (err) {
            return cb(err);
          }
          var n = {
            _id: newsletter._id,
            month: newsletter.month - 1,
            year: newsletter.year,
            description: 'Newsletter for ' + newsletter.month + '/' + newsletter.year,
            path: newName,
            fileName: attachmentName,
            authorId: '9fd28734079edc0f2bd6ff25b309f966'
          };
          cb(null, n);
        });
      },
      name: 'newsletter',
      createdDate: 'not-there'
    },
    event: {
      map: function (event, cb) {
        if (event.activity !== 'ride') {
          var d = new Date(event.date);
          if (isNaN(d.valueOf())) {
            return cb();
          }
          return cb(null, {
            _id: event._id,
            title: event.title,
            activity: event.activity,
            sponsor: event.sponsor,
            attendance: event.attendance,
            authorId: event.creator.id,
            days: [{
              year: d.getFullYear(),
              month: d.getMonth(),
              date: d.getDate(),
              meetAt: event.meetAt,
              description: event.description,
              location: event.destination,
              locationUrl: event.destinationUrl,
              endsAt: event.endsAt
            }]
          });
        }

        var attachmentPromises = {};
        var attachmentProperties = [ 'routeGpx', 'routePdf', 'routeEst' ];
        for (var i = 0; i < attachmentProperties.length; i += 1) {
          var prop = attachmentProperties[i];
          if (event[prop]) {
            attachmentPromises[prop] = promisify(att, 'getAttachment', event._id, event[prop].replace(/\s/g, '_'));
          }
        }
        Promise.hash(attachmentPromises)
          .then(function (values) {
            var d = new Date(event.date);
            if (isNaN(d.valueOf())) {
              return cb();
            }
            var r = {
              _id: event._id,
              title: event.title,
              sponsor: event.sponsor,
              attendance: event.attendance,
              authorId: event.creator.id,
              days: [{
                year: d.getFullYear(),
                month: d.getMonth(),
                date: d.getDate(),
                meetAt: event.meetAt,
                ksuAt: event.ksuAt,
                startFrom: event.start,
                description: event.description,
                destination: event.destination,
                destinationUrl: event.destinationUrl,
                endsAt: event.endsAt,
                cancelledReason: event.cancelled,
                roadCaptain: event.roadCaptain,
                routeFiles: {}
              }]
            };
            if (event['routeGpx']) {
              r.days[0].routeFiles.garmin = {
                fileName: event['routeGpx'],
                path: values['routeGpx']
              };
            }
            if (event['routePdf']) {
              r.days[0].routeFiles.pdf = {
                fileName: event['routePdf'],
                path: values['routePdf']
              };
            }
            if (event['routeEst']) {
              r.days[0].routeFiles.est = {
                fileName: event['routeEst'],
                path: values['routeEst']
              };
            }
            cb(null, r);
          })
          .catch(cb);
      },
      name: function (event) {
        if (event.activity === 'ride') {
          return 'ride';
        }
        return 'event';
      },
      createdDate: 'enteredDate'
    }
  };

  var unprocessed = [];
  setUp()
    .then(function () {
      var account = lookup.account.new({
        "domain" : "republichog.org",
        "name" : "Republic H.O.G.",
        "subdomain" : "rhog",
        "type" : "account"
      });
      var settings = lookup.settings.new({
        "name" : "Republic H.O.G.",
        "rideLegalese": "Routes and destinations are subject to change with little or no notice and more info may be added so check the calendar often for changes. Scroll to the very bottom of the page and there will be an update date so you will know if any changes have been made since the last time you looked and as always be sure to have your light blue membership card for 2015 (you will have to sign a waiver if you don't) and have a full tank of gas. In the event of a cancelation, a notice will be posted on the calendar and an email will go out 1 1/2 hrs before KSU.",
        "type" : "settings"
      });
      return Promise.all([
        promisify(account.to(masterurl), 'save'),
        promisify(settings.to(chapterurl), 'save')
      ]);
    })
    .then(function () {
      return promisify(bakdb, 'view', 'Admin', 'everythingButMail', { include_docs: true });
    })
    .then(function (result) {
      var docs = result.rows;
      var promises = [];

      for (var i = 0; i < docs.length; i += 1) {
        var doc = docs[i].doc;
        var type = doc.type;
        var converter = converters[type];

        if (!converter) {
          continue;
        }

        var name = converter.name;
        if (typeof name === 'function') {
          name = name(doc);
        }
        var builder = lookup[name];
        if (!builder) {
          console.error('ERROR! can not find lookup for', converter.name);
          throw new Error('ERROR! can not find lookup for ' + converter.name)
        }

        if (converter.map.length === 1) {
          var inst = builder.new(converter.map(doc));
          inst.createdOn = doc[converter.createdDate];
          promises.push(promisify(inst.to(chapterurl), 'save'));
        } else {
          var save = function (builder, doc) {
            return function (d) {
              if (!d) {
                unprocessed.push(doc._id);
                return;
              }
              var promises = [];
              if (!Array.isArray(d)) {
                d = [d];
              }
              for (var i = 0; i < d.length; i += 1) {
                var dd = d[i];
                var inst = builder.new(dd);
                inst.createdOn = doc[converter.createdDate];
                promises.push(promisify(inst.to(chapterurl), 'save'));
              }
            };
            return Promise.all(promises);
          };
          var p = promisify(converter, 'map', doc)
            .then(save(builder, doc))
            .then(function (d) {
            });
          promises.push(p);
        }
      }

      return Promise.all(promises);
    })
    .then(function () {
      console.log('Did not process', unprocessed);
    })
    .catch(function (e) {
      console.error('ERROR!', e, e.stack);
    });
});

gulp.task('db:sync', [ 'build:es6-server' ], function (cb) {
  initModels();
  sync()
    .then(function () { cb(); })
    .catch(cb);
});

};

