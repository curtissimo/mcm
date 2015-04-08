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

  this.composes('blogs', blog);

  this.bool('isRoadCaptain');                                 // isRoadCaptain
  this.bool('isLohMember');                                   // lohMember
  this.string('title');                                       // title
  this.string('officerEmail');                                // officerEmail

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
      emitKey([ member.lastName, member.firstName ]);
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
});

export default member;
