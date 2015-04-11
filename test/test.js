import assert from 'assert';
import { hook_rcpt } from '../src/inbound/plugins/rcpt_to.couch';
import member from '../src/inbound/models/member';
import account from '../src/inbound/models/account';

/* from haraka */
let deny               = 902;
let denysoft           = 903;
let ok                 = 906;

process.env.MCM_DB = 'http://localhost:5984';

function initMemberFrom(e, officers) {
  member.from = () => {
    return {
      onlyOfficers(fn) {
        fn(e, officers);
      }
    };
  };
}

function initAccountFrom(e, accounts) {
  account.from = () => {
    return {
      byUrl(id, fn) {
        fn(e, accounts);
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
  next(code, msg) {
    this.code = code;
    this.msg = msg;
  }
}

let fn = () => {};
let connection = { logemerg: fn, loginfo: fn };

let accountQueryFails = () => {
  let c = new Continuation();
  account.from = () => { throw 'doodoo!' };
  try {
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    assert.fail('no exception raised');
  } catch (e) {}
};

let accountQueryErrors = () => {
  let c = new Continuation();
  initAccountFrom('shit');
  hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
  assert.equal(c.code, denysoft);
  assert.equal(c.msg, 'Requested action aborted: local error in processing');
};

let accountQueryReturnsNothing = () => {
  let c = new Continuation();
  initAccountFrom(null, []);
  hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
  assert.equal(c.code, deny);
  assert.equal(c.msg, '5.7.1 Unable to relay for bob@bob.com');
};

let memberQueryFails = () => {
  let c = new Continuation();
  initAccountFrom(null, [{ subdomain: 'whatever' }]);
  member.from = () => { throw 'poo!' };
  try {
    hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
    assert.fail('no exception raised');
  } catch (e) {}
};

let queryErrors = () => {
  let c = new Continuation();
  initAccountFrom(null, [{ subdomain: 'whatever' }]);
  initMemberFrom('shit');
  hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
  assert.equal(c.code, denysoft);
  assert.equal(c.msg, 'Requested action aborted: local error in processing');
};

let emailDoesNotExist = () => {
  let c = new Continuation();
  initAccountFrom(null, [{ subdomain: 'whatever' }]);
  initMemberFrom(null, [{ officerEmail: 'carl@carl.org' }]);
  hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
  assert.equal(c.code, deny);
  assert.equal(c.msg, 'Bad email address.');
};

let emailExists = () => {
  let c = new Continuation();
  initAccountFrom(null, [{ subdomain: 'whatever' }]);
  initMemberFrom(null, [{ officerEmail: 'bob@bob.com' }]);
  hook_rcpt(c.next.bind(c), connection, [ makeParams('bob@bob.com') ]);
  assert.equal(c.code, ok);
  assert.equal(c.msg, undefined);
};

export default () => {
  accountQueryFails();
  accountQueryErrors();
  accountQueryReturnsNothing();
  memberQueryFails();
  queryErrors();
  emailDoesNotExist();
  emailExists();
};
