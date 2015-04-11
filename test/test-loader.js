require('babel/register');
require('./test')();
if (process.env.INTEGRATION_TESTS) {
  require('./integration-test')();
}
