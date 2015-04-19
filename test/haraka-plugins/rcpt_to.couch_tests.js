import assert from 'assert';
import url from 'url';
import { hook_rcpt } from '../../src/haraka-plugins/inbound/plugins/rcpt_to.couch';
import member from '../../src/models/member';
import account from '../../src/models/account';

/* from haraka */
let deny               = 902;
let denysoft           = 903;
let ok                 = 906;

process.env.MCM_DB = 'http://localhost:5984';

function initMemberFrom(e, officers) {
  member.from = () => {
    return {
      onlyOfficers(fn) {
        process.nextTick(() => fn(e, officers));
      }
    };
  };
}

function initAccountFrom(e, accounts) {
  account.from = () => {
    return {
      byUrl(id, fn) {
        process.nextTick(() => fn(e, accounts));
      }
    };
  };
}

function makeParams(email) {
  return {
    original: email,
    user: email.toLowerCase().substring(0, email.indexOf('@')),
    host: email.toLowerCase().substring(email.indexOf('@') + 1)
  };
}

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

let fn = () => {};
let connection = { logemerg: fn, loginfo: fn, transaction: { notes: {} } };

describe('rcpt_to#hook_rcpt_to', () => {
  it('should not absorb the error raised from the account query', done => {
    let c = new Continuation();
    account.from = () => { throw 'doodoo!' };
    try {
      hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
      assert.fail('no exception raised');
    } catch (e) {}
    done();
  });

  it('should soft deny on a couch error', done => {
    let c = new Continuation();
    initAccountFrom('shit');
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    c.promise.then(() => {
      assert.equal(c.code, denysoft);
      assert.equal(c.msg, 'Requested action aborted: local error in processing');
      done();
    })
    .catch(e => done(e));
  });

  it('should deny for user not in the domain', done => {
    let c = new Continuation();
    initAccountFrom(null, []);
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    c.promise.then(() => {
      assert.equal(c.code, deny);
      assert.equal(c.msg, '5.7.1 Unable to relay for bob@bob.com');
      done();
    })
    .catch(e => done(e));
  });

  it('should deny soft on an error raised from the member query', done => {
    let c = new Continuation();
    initAccountFrom(null, [{ subdomain: 'whatever' }]);
    member.from = () => { throw 'poo!' };
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    c.promise.then(() => {
      assert.equal(c.code, denysoft);
      assert.equal(c.msg, 'Requested action aborted: local error in processing');
      done();
    })
    .catch(e => done(e));
  });

  it('should deny soft on a couch error', done => {
    let c = new Continuation();
    initAccountFrom(null, [{ subdomain: 'whatever' }]);
    initMemberFrom('shit');
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    c.promise.then(() => {
      assert.equal(c.code, denysoft);
      assert.equal(c.msg, 'Requested action aborted: local error in processing');
      done();
    })
    .catch(e => done(e));
  });

  it('should deny on a bad email address', done => {
    let c = new Continuation();
    initAccountFrom(null, [{ subdomain: 'whatever' }]);
    initMemberFrom(null, [{ officerInbox: 'carl', _id: 8 }]);
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    c.promise.then(() => {
      assert.equal(c.code, deny);
      assert.equal(c.msg, 'Bad email address.');
      assert.equal(connection.transaction.notes['bob@bob.com'], undefined);
      assert.equal(connection.transaction.notes['carl@carl.com'], undefined);
      done();
    })
    .catch(e => done(e));
  });

  it('should OK for a good address', done => {
    let c = new Continuation();
    let subdomain = 'whatever';
    let fullDomain = url.resolve(process.env.MCM_DB, subdomain);
    initAccountFrom(null, [{ subdomain: subdomain }]);
    initMemberFrom(null, [{ officerInbox: 'bob', _id: 3 }]);
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    c.promise.then(() => {
      assert.equal(c.code, ok);
      assert.equal(c.msg, undefined);
      assert.equal(connection.transaction.notes['bob@bob.com'].id, 3);
      assert.equal(connection.transaction.notes['bob@bob.com'].db, fullDomain);
      done();
    })
    .catch(e => done(e));
  })
});
