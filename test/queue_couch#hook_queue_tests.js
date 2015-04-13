import assert from 'assert';
import mimelib from 'mimelib';
import email from '../src/inbound/models/email';
import { hook_queue } from '../src/inbound/plugins/queue/couch';

/* from haraka */
let deny               = 902;
let denysoft           = 903;
let ok                 = 906;

email.new = proto => {
  let o = Object.create(proto);
  o.to = () => {
    return {
      save: cb => {
        process.nextTick(() => cb(null, o));
      }
    };
  };
  return o;
};

class Continuation {
  constructor() {
    let self = this;
    this.güt = null;
    this.p = new Promise((good, bad) => {
      self.güt = good;
    });
  }

  next(code, msg) {
    this.code = code;
    this.msg = msg;
    this.güt();
  }

  get promise() {
    return this.p;
  }
}

describe('queue/couch#hook_queue', () => {
  let connection = {};

  beforeEach(done => {
    connection = {
      loginfo: () => {},
      logcrit: () => console.error,
      logemerg: () => console.error,
      transaction: {
        notes: {
          'awesomedude.example.com': { db: 'http://localhost:5984/example' },
          'anotherdude.example.com': { db: 'http://localhost:5984/example' }
        },
        mail_from: [],
        rcpt_to: [{
          original: 'awesomedude@example.com',
          user: 'awesomedude',
          host: 'example.com'
        }, {
          original: 'anotherdude@example.com',
          user: 'anotherdude',
          host: 'example.com'
        }],
        header: {
          headers_decoded: {
            to: [ `Some Awesome Title <awesomedude@example.com>,
                   anotherdude@example.com, bob@boberts.example`],
            date: [ 'Tue, 15 January 2008 16:02:43 -0500' ],
            from: [ 'Mark Wahlberg <mark@wahlberg.gov>' ],
            'message-id': [ '<123456.123456@wahlberg.gov>' ],
            subject: [ 'Test Email' ]
          }
        },
        body: {
          children: [{
            ct: 'text/plain; blah blah blah',
            body_text_encoded: 'This is the plain text portion of the email.'
          }, {
            ct: 'text/html; yada yada yada',
            header: {
              headers_decoded: {
                'content-transfer-encoding': 'quoted-printable'
              }
            },
            body_text_encoded: mimelib.encodeQuotedPrintable(`<html>
              <head><title>Test Email</title></head>
              <body>
                <h1>This is really long text merely to make the dumb encoding wrap with the stupid equal sign thing,</h1>
                <p>And, here’re some «special characters».</p>
              </body></html>`)
          }]
        }
      }
    };
    done();
  });

  it('should save emails', done => {
    let c = new Continuation();
    hook_queue(c.next.bind(c), connection);
    c.promise.then(() => {
      assert.equal(c.code, ok);
      done();
    })
    .catch(e => done(e));
  });

  it('should deny for no accounts', done => {
    connection.transaction.notes = {};
    let c = new Continuation();
    hook_queue(c.next.bind(c), connection);
    c.promise.then(() => {
      assert.equal(c.code, deny);
      assert(c.msg.indexOf('5.7.1 Unable to relay for ') == 0);
      done();
    })
    .catch(e => done(e));
  });
});
