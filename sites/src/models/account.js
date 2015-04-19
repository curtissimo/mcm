import stork from 'stork-odm';

let account = stork.deliver('account', function () {
  this.string('name');
  this.string('subdomain');
  this.string('domain');
  this.timestamps();

  this.view('byUrl', function (account, emitKey) {
    emitKey(account.subdomain + '.ismymc.com');
    if (account.domain) {
      emitKey(account.domain);
      emitKey('www.' + account.domain);
    }
  });
});

export default account;
