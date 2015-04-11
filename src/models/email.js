import stork from 'stork-odm';
import recipient from './recipient.js';

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
    mail.to = mail.to || [];

    for (var i = 0; i < mail.to.length; i += 1) {
      if (mail.to[i].status === 'received') {
        emitKey([ mail.to[i].toLowerCase(), mail.received ]);
      }
    }
  });
});

export default entity;
