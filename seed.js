var d, config, ycb, fs, url, text, nano, rsvp, promise, environment, page, chapter, member, masterdb, chapterdb, chapterName;

nano = require('nano');
rsvp = require('rsvp');
ycb = require('ycb');
fs = require('fs');
url = require('url');
chapter = require('./lib/models/chapter');
member = require('./lib/models/member');
page = require('./lib/models/page');

chapterName = 'republichog';
d = rsvp.denodeify;

text = fs.readFileSync('config.json', 'utf8');
environment = { environment: process.argv[2] || 'production' };
config = new ycb.Ycb(JSON.parse(text)).read(environment);
server = nano(config.db.server);
masterdb = url.resolve(config.db.server, config.db.master);
chapterdb = url.resolve(config.db.server, chapterName);

new rsvp.Promise(function(g) { g(); })
  .then(function () {
    return d(server.db.destroy)(config.db.master);
  })
  .then(function () {
    return d(server.db.create)(config.db.master);
  })
  .then(function () {
    return d(server.db.destroy)(chapterName);
  })
  .then(function () {
    return d(server.db.create)(chapterName);
  })
  .then(function () {
    return d(chapter.to(masterdb).sync)();
  })
  .then(function () {
    return d(member.to(chapterdb).sync)();
  })
  .then(function () {
    return d(page.to(chapterdb).sync)();
  })
  .then(function() {
    return d(server.db.compact)(config.db.master, chapter.$kind);
  })
  .then(function() {
    return d(server.db.compact)(chapterName, member.$kind);
  })
  .then(function() {
    return d(server.db.compact)(chapterName, page.$kind);
  })
  .then(function () {
    var c = chapter.new({
      _id: 'republichog',
      name: 'Republic H.O.G.',
      domains: [ 'republichog.dev' ],
      city: 'Stafford',
      state: 'TX',
      chapterNumber: 1115,
      sponsor: {
        name: 'Republic H.D.',
        url: 'http://republichd.com'
      },
      theme: 'leather',
      urls: {
        facebook: 'https://www.facebook.com/pages/Republic-Harley-Owners-Group/219625578179322',
        photos: 'https://republichog.shutterfly.com/',
        twitter: 'https://twitter.com/RepublicHOG'
      },
      sections: {
        dashboard: true,
        discussions: true,
        events: true,
        members: true,
        newsletters: true
      }
    });
    return d(c.to(masterdb).save)();
  })
  .then(function() {
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909beac',
      email: 'curtis@schlak.com',
      login: 'cschlak',
      hogNumber: 'US12345678',
      password: 'lovely',
      firstName: 'Curtis',
      lastName: 'Schlak',
      photo: { type: 'image/jpeg', content: new Buffer('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', 'base64') }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909bedd',
      email: 'leslie@schlak.com',
      login: 'lschlak',
      hogNumber: 'US87654321',
      password: 'lovelier',
      firstName: 'Leslie',
      lastName: 'Schlak'
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909beee',
      email: 'isaac@schlak.com',
      login: 'ischlak',
      hogNumber: 'US88888888',
      password: 'zuck',
      firstName: 'Isaac',
      lastName: 'Schlak'
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909beff',
      email: 'lola@schlak.com',
      login: 'lola.schlak',
      hogNumber: 'US11111111',
      password: 'lovelier',
      firstName: 'Lola',
      lastName: 'Schlak',
      photo: { type: 'image/jpeg', content: new Buffer('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', 'base64') }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    var p = page.new({
      _id: '/',
      title: 'Welcome to Republic H.O.G.',
      menuName: 'Home',
      parts: [
        '<h1>Welcome!</h1>',
        '<p>You\'re really great, man.</p>'
      ]
    });
    return d(p.to(chapterdb).save)();
  })
  .then(function() {
    var p = page.new({
      _id: '/about-us',
      title: 'About Us',
      menuName: 'About Us',
      parts: [
        '<h1>We\'re friggin awesome!</h1>',
        '<p>And you are, too!</p>'
      ]
    });
    return d(p.to(chapterdb).save)();
  })
  .catch(function (error) {
    console.log('error', error);
  });

// chapter.to(masterdb).sync();
// member.to(chapterdb).sync();
// page.to(chapterdb).sync();
