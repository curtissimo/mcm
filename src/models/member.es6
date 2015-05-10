import stork from 'stork-odm';
import blog from './blog';

let member = stork.deliver('member', function () {
  this.string('firstName', { required: true, minLength: 2 }); // firstName
  this.string('middleIntitial');                              // middleInitial
  this.string('lastName', { required: true, minLength: 2 });  // lastName
  this.string('nickName');                                    // nickName
  this.string('email', { required: true, format: 'email' });  // email
  this.string('password', { required: true, minLength: 6 });  // password
  this.string('hogNumber', { required: true, minLength: 6 }); // hogNumber
  this.string('mobile');                                      // cellPhoneNbr
  this.string('phone');                                       // phoneNbr
  this.string('sex');                                         // sex
  this.bool('private');                                       // privateName
  this.datetime('birthDate');                                 // birthDate
  this.timestamps();

  this.array('achievements');
  this.array('mileage');

  this.composes('blogs', blog);

  this.bool('isRoadCaptain');                                 // isRoadCaptain
  this.bool('isLohMember');                                   // lohMember
  this.string('title');                                       // title
  this.string('officerInbox');                                // officerEmail.substring(up to '@')

  this.object('motorcycle', function () {
    this.string('model');                                     // motorcycleModel
    this.number('year');                                      // motorcycleYear
  });

  this.object('spouse', function () {
    this.string('firstName');                                 // spouseFirstName
    this.string('lastName');                                  // spouseLastName
  });

  this.object('emergencyContact', function () {
    this.string('name');                                      // firstName
    this.string('mobile');                                    // cellPhoneNbr
    this.string('phone');                                     // phoneNbr
  });

  this.object('address', function () {
    this.string('street1');                                   // address1
    this.string('street2');                                   // address2
    this.string('city');                                      // city
    this.string('state');                                     // state
    this.string('zip');                                       // zip
  });

  this.object('membership', function () {
    this.object('national', function () {
      this.string('type');                                    // typeMembership
      this.datetime('startDate');                             // nationalHogMemberSinceDate
      this.datetime('endDate');                               // nationalHogExpirationDate
    });
    this.object('local', function () {
      this.datetime('startDate', { required: true });         // memberSinceDate
      this.datetime('endDate', { required: true });           // expirationDate
    });
  });

  this.object('permissions', function () {
    this.bool('canManageNewsletters');                        // ?
    this.bool('canManageSettings');                           // canAdminChapterInfo
    this.bool('canManageEvents');                             // canAdminCalendar
    this.bool('canManagePermissions');                        // canAdminSecurity
    this.bool('canManagePublicDocuments');                    // canAdminPublicDocuments
    this.bool('canManagePrivateDocuments');                   // canAdminPrivateDocuments
    this.bool('canManageDiscussion');                         // canAdminDiscussions
    this.bool('canManageMembers');                            // canAdminMembers
    this.bool('canManageRoadCaptains');                       // ?
  });

  this.object('emailPreferences', function () {
    this.bool('getCalendarReminders');                        // calReminderEmail
    this.bool('getDiscussions');                              // discussEmail
    this.bool('getNewsletter');                               // newsLetterEmail
  });

  this.object('privacy', function () {
    this.bool('showEmail');                                   // !privateEmail
    this.bool('showPhone');                                   // !privatePhone
    this.bool('showAddress');                                 // !privateAddress
  });

  this.sort('lastName', 'firstName');

  this.view('onlyOfficers', function (member, emitKey) {
    if (member.title) {
      emitKey([ member.title ]);
    }
  });

  this.view('onlyRoadCaptains', function (member, emitKey) {
    if (member.isRoadCaptain) {
      emitKey([ member.lastName, member.firstName ]);
    }
  });

  this.view('notRoadCaptains', function (member, emitKey) {
    if (!member.isRoadCaptain) {
      emitKey([ member.lastName, member.firstName ]);
    }
  });

  this.view('byLogin', function (member, emitKey) {
    if (member.email) {
      emitKey(member.email);
    }
    if (member.hogNumber) {
      emitKey(member.hogNumber);
    }
  });

  this.view('byHogNumber', function (member, emitKey) {
    if (member.hogNumber) {
      emitKey(member.hogNumber);
    }
  });

  this.view('wantingDiscussions', function(member, emitKey) {
    if (member.emailPreferences && member.emailPreferences.getDiscussions) {
      emitKey(null);
    }
  });

  this.view('wantingCalendarEvents', function(member, emitKey) {
    if (member.emailPreferences && member.emailPreferences.getCalendarReminders) {
      emitKey(null);
    }
  });
});

member.projections = {
  activeOnly: {
    name: 'All members in good standing',
    title: 'Active Members',
    projection: (db, callback) => {
      member.from(db).all((e, entities) => {
        if (e) {
          return callback(e);
        }
        let now = new Date();
        let results = [];
        for (let entity of entities) {
          if (entity.membership.national.endDate < now) {
            continue;
          }
          if (entity.membership.local.endDate < now) {
            continue;
          }
          results.push(entity);
        }
        callback(null, results);
      });
    }
  },
  all: {
    name: 'All chapter members include the expired ones',
    title: 'Everyone',
    projection: (db, callback) => {
      member.from(db).all(callback);
    }
  },
  localExpiredOnly: {
    name: 'Chapter members with expired local membership',
    title: 'Local Expired Members',
    projection: (db, callback) => {
      member.from(db).all((e, entities) => {
        if (e) {
          return callback(e);
        }
        let now = new Date();
        let results = [];
        for (let entity of entities) {
          if (entity.membership.local.endDate < now) {
            results.push(entity);
          }
        }
        callback(null, results);
      });
    }
  },
  nationalExpiredOnly: {
    name: 'Chapter members with expired national membership',
    title: 'National Expired Members',
    projection: (db, callback) => {
      member.from(db).all((e, entities) => {
        if (e) {
          return callback(e);
        }
        let now = new Date();
        let results = [];
        for (let entity of entities) {
          if (entity.membership.national.endDate < now) {
            results.push(entity);
          }
        }
        callback(null, results);
      });
    }
  },
  expiredOnly: {
    name: 'Chapter members with expired membership of either kind',
    title: 'Any Expired Members',
    projection: (db, callback) => {
      member.from(db).all((e, entities) => {
        if (e) {
          return callback(e);
        }
        let now = new Date();
        let results = [];
        for (let entity of entities) {
          if (entity.membership.national.endDate < now) {
            results.push(entity);
            continue;
          }
          if (entity.membership.local.endDate < now) {
            results.push(entity);
          }
        }
        callback(null, results);
      });
    }
  },
  onlyOfficers: {
    name: 'Chapter Officers',
    title: 'Chapter Officers',
    projection: (db, callback) => {
      member.from(db).onlyOfficers(callback);
    }
  },
  onlyRoadCaptains: {
    name: 'Road Captains',
    title: 'Road Captains',
    projection: (db, callback) => {
      member.from(db).onlyRoadCaptains(callback);
    }
  },
  discussionRecipients: {
    name: 'Chapter members that receive discussion posts',
    title: 'Discussion Recipients',
    projection: (db, callback) => {
      member.from(db).wantingDiscussions(callback);
    }
  }
};

export default member;
