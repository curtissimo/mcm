var require = require('./util/require').override(__dirname, require)
  , simplesmtp = require('simplesmtp')
  , dns = require('dns')
  , async = require('async')
  , mimelib = require('mimelib')
  , config = require('./config')
  , nano = require('nano')(config.db.host)
  , masterdb = nano.db.use(config.db.name)
  , mailerName = 'mailer.curtissimo.com'
  , doTimeout = function() {
      timeout = setTimeout(doTimeout, 100000000);
    }
  , timeout
  , server
  , makefinish = function(r, mta, cb) {
      return function(hasError, message) {
        var status = r.doc.status || {attempts: 0}
          , now = new Date()
          ;
        console.log(hasError? now.toISOString() + ' ERR: ' : now.toISOString() + '  OK: ', r.doc.to, message)
        if(mta.ended) {
          return;
        }
        mta.ended = true;
        now.setMinutes(now.getMinutes() + 30);
        r.doc.status = {
          error: hasError
        , message: message
        , attempts: status.attempts + 1
        , nextTry: [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()]
        };
        var chapterdb = nano.db.use(r.source);
        chapterdb.insert(r.doc, function(err, body) {
          if(err && err.status_code !== 409) {
            console.log(err);
          } else {
            mta.close();
          }
          cb();
        });
      }
    }
  ;

(function(module) {
  var mailer = function(cb) {
    masterdb.view('chapters', 'chapters', function(err, result) {
      var chapterQueries = []
        ;
      if(err) {
        console.log(err);
        return;
      }
      result.rows.forEach(function(r) {
        chapterQueries.push((function(id) {
          return function(cb) {
            var chapterdb = nano.db.use(id)
              , now = new Date()
              , options = {
                  include_docs: true
                , endkey: [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()]
                , limit: 25
                }
              ;
            chapterdb.view('chapter', 'unprocessedMail', options, function(err, result) {
              result.rows.forEach(function(r) {
                r.source = id;
              });
              cb(err, result.rows);
            });
          };
        })(r.id));
      });

      async.parallel(chapterQueries, function(err, results) {
        var results = Array.prototype.concat.apply([], results);
        if(err) {
          console.log(err);
          console.log('******************************************************');
          cb();
        } else if(results.length === 0) {
          cb();
        } else {
          results.forEach(function(r) {
            var to = r.doc.to
              , atindex = to.lastIndexOf('@')
              , host = to.substring(atindex + 1).replace(/[<>]/g, '')
              , chapterdb = nano.db.use(r.source)
              ;
            dns.resolveMx(host, function(e, entries) {
              var mta
                , mx = {exchange: '', priority: 100000}
                , finish
                , now = new Date()
                ;
              if(e || entries.length === 0) {
                e = e || {};
                e.context = {mx: mx};
                r.doc.status = {
                  error: true
                , nextTry: [now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes()]
                , message: e
                };
                chapterdb.insert(r.doc, function(err, body) {
                  if(err) {
                    console.log(err);
                  }
                });
                return;
              }
              entries.forEach(function(entry) {
                if(entry.priority < mx.priority) {
                  mx = entry;
                }
              });
              mta = simplesmtp.connect(25, mx.exchange, {
                name: mailerName
              , debug: config.inDev
              , secureConnection: false
              });
              finish = makefinish(r, mta, cb);
              mta.on('rcptFailed', function(addresses) {
                if(addresses.length) {
                  err.context = {mx: mx};
                  err.message = 'TO address failed';
                  finish(true, err);
                }
              });
              mta.on('ready', function(success, response) {
                finish(!success, response);
              });
              mta.on('error', function(err) {
                err.context = {mx: mx};
                finish(true, err);
              });
              mta.on('end', function() {
                finish(false, '');
              });
              mta.once('idle', function() {
                var from = r.doc.from
                  , to = r.doc.to
                  ;
                if(from.indexOf('<') > -1) {
                  from = from.match(/<([^>]+)/)[1];
                }
                if(to.indexOf('<') > -1) {
                  to = to.match(/<([^>]+)/)[1];
                }
                mta.useEnvelope({
                  from: from
                , to: [to]
                });
              });
              mta.on('message', function() {
                mta.write('Content-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: quoted-printable\r\nMessage-Id: ')
                mta.write(r.doc._id);
                mta.write('\r\nX-Mailer: MCM mailer daemon');
                mta.write('\r\nDate: ');
                mta.write(new Date(r.doc.sent).format('ddd, dd mmm yyyy HH:MM:ss o'));
                mta.write('\r\nFrom: ');
                mta.write(r.doc.from);
                mta.write('\r\nSubject: ');
                mta.write(r.doc.subject);
                mta.write('\r\nTo: ');
                mta.write(r.doc.to);
                mta.write('\r\n\r\n');
                mta.end(mimelib.encodeQuotedPrintable(r.doc.body));
              });
            });
          });
        }
      });
    });
  };

  module.exports.start = function(cb) {
    mailer(cb);
  }

  doTimeout();
})(module);
