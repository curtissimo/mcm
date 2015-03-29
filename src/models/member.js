import stork from 'stork-odm';
import blog from './blog';

let member = stork.deliver('member', function () {
  this.string('firstName', { required: true, minLength: 2 });
  this.string('lastName', { required: true, minLength: 2 });
  this.string('email', { required: true, format: 'email' });
  this.string('password', { required: true, minLength: 6 });
  this.string('hogNumber', { required: true, minLength: 6 });
  this.string('mobile');
  this.string('phone');
  this.bool('private');
  this.timestamps();

  this.array('achievements');

  this.composes('blogs', blog);

  this.object('address', function () {
    this.string('street1');
    this.string('street2');
    this.string('city');
    this.string('state');
    this.string('zip');
  });

  this.object('membership', function () {
    this.object('national', function () {
      this.datetime('startDate');
      this.datetime('endDate');
    });
    this.object('local', function () {
      this.datetime('startDate', { required: true });
      this.datetime('endDate', { required: true });
    });
  });

  this.object('permissions', function () {
    this.bool('canManageNewsletters');
    this.bool('canManageMembers');
  });

  this.object('privacy', function () {
    this.bool('showEmail');
    this.bool('showPhone');
    this.bool('showAddress');
  });

  this.sort('lastName', 'firstName');

  this.view('byLogin', function (member, emitKey) {
    emitKey(member.email);
    emitKey(member.hogNumber);
  });
});

export default member;
