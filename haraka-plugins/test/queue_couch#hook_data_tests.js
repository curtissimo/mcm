import assert from 'assert';
import { hook_data } from '../src/inbound/plugins/queue/couch';

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

describe('queue/couch#hook_data', () => {
  let connection = {};

  beforeEach(done => {
    connection = {
      transaction: {
        parse_body: false
      }
    };
    done();
  });

  it('should set the transaction#parse_body flag to true', done => {
    let c = new Continuation();
    hook_data(c.next.bind(c), connection);
    c.promise.then(() => {
      assert.equal(connection.transaction.parse_body, true);
      done();
    });
  });

  it('should not pass a code to next', done => {
    let c = new Continuation();
    hook_data(c.next.bind(c), connection);
    c.promise.then(() => {
      assert.equal(c.code, undefined);
      done();
    });
  });
});
