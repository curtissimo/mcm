var fs = require('fs');
var nano = require('nano');
var lookup = {};

function initModels() {
  if (Object.keys(lookup).length > 0) {
    return;
  }

  lookup = {
    account: null,
    settings: null,
    blog: null,
    member: null,
    newsletter: null,
    document: null,
    discussion: null,
    comment: null,
    event: null
  };

  var keys = Object.keys(lookup);
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i];
    lookup[key] = require('./build/models/' + key);
  }
}

exports.initialize = function (gulp, db) {

var chapterName = 'rhog';
var masterurl = db + '/mcm-master';
var chapterurl = db + '/' + chapterName;
var bakurl = db + '/' + chapterName + '-bak';

var db = nano(masterurl);
var dbms = nano(db.config.url);
var bakdb = nano(bakurl);

function promisify(scope, method) {
  var args = Array.prototype.slice.apply(arguments);
  args.splice(1, 1);
  var fn = scope[method].bind.apply(scope[method], args);
  return new Promise(function (good, bad) {
    fn(function (err, value) {
      if (err) {
        return bad(err);
      }
      try {
        good(value);
      } catch (e) {
        bad(e);
      }
    });
  })
}

function setUp() {
  return promisify(dbms.db, 'destroy', db.config.db)
    .then(function () { return promisify(dbms.db, 'create', db.config.db); })
    .then(function () { return promisify(dbms.db, 'destroy', chapterName); })
    .then(function () { return promisify(dbms.db, 'create', chapterName); })
    .then(function () {
      return Promise.all([
        promisify(lookup.account.to(masterurl), 'sync'),
        promisify(lookup.settings.to(chapterurl), 'sync'),
        promisify(lookup.blog.to(chapterurl), 'sync'),
        promisify(lookup.member.to(chapterurl), 'sync'),
        promisify(lookup.newsletter.to(chapterurl), 'sync'),
        promisify(lookup.document.to(chapterurl), 'sync'),
        promisify(lookup.discussion.to(chapterurl), 'sync'),
        promisify(lookup.comment.to(chapterurl), 'sync'),
        promisify(lookup.event.to(chapterurl), 'sync')
      ]);
    });
}

gulp.task('db:migrate', [ 'es6-server' ], function (cb) {
  initModels();

  var nameMap = {
    topic: 'discussion'
  };

  var converters = {
    topic: function (topic) {
      return {
        _id: topic._id,
        title: topic.subject,
        content: topic.message,
        authorId: topic.author.id,
        category: topic.category,
        sticky: topic.sticky
      };
    }
  };

  setUp()
    .then(function () {
      return promisify(bakdb, 'view', 'Admin', 'everythingButMail', { include_docs: true });
    })
    .then(function (result) {
      var docs = result.rows;
      var promises = [];

      for (var i = 0; i < docs.length; i += 1) {
        var doc = docs[i].doc;
        var type = doc.type;
        var mapped = nameMap[type];
        var notmapped = {};

        if (!mapped) {
          notmapped[type] = null;
          continue;
        }

        var converter = converters[type];
        var inst = lookup[mapped].new(converter(doc));
        promises.push(promisify(inst.to(chapterurl), 'save'));
      }

      console.log('not mapping', Object.keys(notmapped));

      return Promise.all(promises);
    })
    .then(function () {
      console.log('Wow, that was some inserting!');
    })
    .catch(function (e) {
      console.error('ERROR!', e);
    });
});

gulp.task('db:seed', [ 'es6-server' ], function (cb) {
  initModels();

  setUp()
    .then(function () {
      return promisify(fs, 'readFile', './seed.json', 'utf8');
    })
    .then(function (seeds) {
      seeds = JSON.parse(seeds);
      var promises = [];

      for (var i = 0; i < seeds.length; i += 1) {
        var seed = seeds[i];
        var builder = lookup[seed.type];
        var instance = builder.new(seed);
        var url = chapterurl;
        if (seed.type === 'account') {
          url = masterurl;
        } else if (seed.type === 'member') {
          if (seed.blogs) {
            for (var j = 0; j < seed.blogs.length; j += 1) {
              seed.blogs[j] = lookup.blog.new(seed.blogs[j]);
            }
          }
        }
        var promise = promisify(instance.to(url), 'save');
        promises.push(promise);
      }
      return Promise.all(promises);
    })
    .then(function () { cb(); })
    .catch(function (e) {
      console.error('ERROR!', e);
      cb(e);
    });
});

};

