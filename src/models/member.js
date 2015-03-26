import stork from 'stork-odm';

let member = stork.deliver('member', function () {
  this.string('firstName', { required: true, minLength: 2 });
  this.string('lastName', { required: true, minLength: 2 });
  this.string('email', { required: true, format: 'email' });
  this.string('password', { required: true, minLength: 6 });
  this.string('hogNumber', { required: true });
  this.timestamps();

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

  this.view('byLogin', function (member, emitKey) {
    emitKey(member.email);
    emitKey(member.hogNumber);
  });
});

export default member;
