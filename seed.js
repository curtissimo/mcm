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
      lastName: 'Schlak'
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
