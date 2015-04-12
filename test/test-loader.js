require('babel/register');
require('./rcpt_to.couch_tests')();
if (process.env.INTEGRATION_TESTS) {
  require('./integration-test')();
}
