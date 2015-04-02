var fs = require('fs');
var nano = require('nano');
var lookup = {};

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
    page: null
  };

  var keys = Object.keys(lookup);
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    lookup[key] = require('./build/models/' + key);
  }
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

function setUp() {
  return promisify(dbms.db, 'destroy', db.config.db)
    .then(function () { return promisify(dbms.db, 'create', db.config.db); })
    .then(function () { return promisify(dbms.db, 'destroy', chapterName); })
    .then(function () { return promisify(dbms.db, 'create', chapterName); })
    .then(function () {
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
        promisify(lookup.page.to(chapterurl), 'sync')
      ]);
    });
}

gulp.task('db:migrate', [ 'es6-server' ], function (cb) {
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
          content: topic.message,
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
          content: comment.message,
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
        if (member.title === 'Webmaster' || member.title === 'Director' || member.title === 'Assistant Director') {
          member.canAdminNewsletters = true;
          member.canAdminChapterInfo = true;
          member.canAdminCalendar = true;
          member.canAdminSecurity = true;
          member.canManagePublicDocuments = true;
          member.canManagePrivateDocuments = true;
          member.canAdminDiscussions = true;
          member.canAdminMembers = true;
        } else if (member.title === 'Newsletter Editor') {
          member.canAdminNewsletters = true;
        }
        return {
          _id: member._id,
          firstName: member.firstName,
          middleInitial: member.middleInitial,
          lastName: member.lastName,
          nickName: member.nickName,
          email: member.email.toLowerCase(),
          password: member.password,
          hogNumber: member.hogNumber.toUpperCase(),
          mobile: member.cellPhoneNbr,
          phone: member.phoneNbr,
          sex: member.sex,
          private: member.privateName,
          birthDate: member.birthDate,
          isRoadCaptain: member.isRoadCaptain,
          isLogMember: member.lohMember,
          title: member.title,
          officerEmail: member.officerEmail,
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
            canManageMembers: !!member.canAdminMembers
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
        bakdb.attachment.get(newsletter._id, attachmentName, function (err, body) {
          if (err) {
            return cb(err);
          }
          fs.writeFile('./src/files/rhog/' + attachmentName, body, function (err2) {
            if (err2) {
              return cb(err2);
            }
            var n = {
              _id: newsletter._id,
              month: newsletter.month - 1,
              year: newsletter.year,
              description: 'Newsletter for ' + newsletter.month + '/' + newsletter.year,
              path: attachmentName,
              fileName: attachmentName,
              authorId: '9fd28734079edc0f2bd6ff25b309f966'
            };
            cb(null, n);
          });
        });
      },
      name: 'newsletter',
      createdDate: 'not-there'
    }
  };

  setUp()
    .then(function () {
      var account = lookup.account.new({
        "domain" : "localhost",
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
      var notmapped = {};

      for (var i = 0; i < docs.length; i += 1) {
        var doc = docs[i].doc;
        var type = doc.type;
        var converter = converters[type];

        if (!converter) {
          notmapped[type] = null;
          continue;
        }
        var builder = lookup[converter.name];

        if (converter.map.length === 1) {
          var inst = builder.new(converter.map(doc));
          inst.createdOn = doc[converter.createdDate];
          promises.push(promisify(inst.to(chapterurl), 'save'));
        } else {
          var save = function (builder, doc) {
            return function (d) {
              var inst = builder.new(d);
              inst.createdOn = doc[converter.createdDate];
              return promisify(inst.to(chapterurl), 'save');
            };
          };
          var p = promisify(converter, 'map', doc)
            .then(save(builder, doc))
            .then(function (d) {
            });
          promises.push(p);
        }
      }

      console.log('not mapping', Object.keys(notmapped));

      return Promise.all(promises);
    })
    .catch(function (e) {
      console.error('ERROR!', e);
    });
});

gulp.task('db:seed', [ 'es6-server' ], function (cb) {
  initModels();

  setUp()
    .then(function () {
      return promisify(fs, 'readFile', './seed.json', 'utf8');
    })
    .then(function (seeds) {
      seeds = JSON.parse(seeds);
      var promises = [];

      for (var i = 0; i < seeds.length; i += 1) {
        var seed = seeds[i];
        var builder = lookup[seed.type];
        var instance = builder.new(seed);
        var url = chapterurl;
        if (seed.type === 'account') {
          url = masterurl;
        } else if (seed.type === 'member') {
          if (seed.blogs) {
            for (var j = 0; j < seed.blogs.length; j += 1) {
              seed.blogs[j] = lookup.blog.new(seed.blogs[j]);
            }
          }
        }
        var promise = promisify(instance.to(url), 'save');
        promises.push(promise);
      }
      return Promise.all(promises);
    })
    .then(function () { cb(); })
    .catch(function (e) {
      console.error('ERROR!', e);
      cb(e);
    });
});

};

