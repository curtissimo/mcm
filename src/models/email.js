import stork from 'stork-odm';

let entity = stork.deliver('email', function () {
  this.datetime('received');
  this.datetime('sent');
  this.string('from');
  this.string('references');
  this.string('messageId');
  this.string('subject');
  this.string('text');
  this.string('html');
  this.object('headers');

  this.array('recipients');

  this.view('byInbox', function (mail, emitKey) {
    mail.recipients = mail.recipients || [];

    for (var i = 0; i < mail.recipients.length; i += 1) {
      if (mail.recipients[i].status === 'received') {
        emitKey([ mail.recipients[i].to.toLowerCase(), mail.received ]);
      }
    }
  });
});

export default entity;
