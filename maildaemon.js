var require = require('./lib/util/require').override(__dirname, require)
  , timeoutlen = 30000
  , _ = require('./lib/util/date')
  , mailer = function() {
      clearTimeout(timeout);
      timeout = null;
      require('./lib/mta').start(function() {
        if(timeout) {
          return;
        }
        timeout = setTimeout(mailer, timeoutlen);
      });
    }
  , timeout = setTimeout(mailer, timeoutlen)
  ;
