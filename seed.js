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
    console.log('destroying master database.');
    return d(server.db.destroy)(config.db.master);
  })
  .then(function () {
    console.log('creating master database.');
    return d(server.db.create)(config.db.master);
  })
  .then(function () {
    console.log('destroying chapter database.');
    return d(server.db.destroy)(chapterName);
  })
  .then(function () {
    console.log('destroying chapter database.');
    return d(server.db.create)(chapterName);
  })
  .then(function () {
    console.log('syncing chapter to master database.');
    return d(chapter.to(masterdb).sync)();
  })
  .then(function () {
    console.log('syncing member to chapter database.');
    return d(member.to(chapterdb).sync)();
  })
  .then(function () {
    console.log('syncing page to chapter database.');
    return d(page.to(chapterdb).sync)();
  })
  .then(function() {
    console.log('compacting chapter views in master database.');
    return d(server.db.compact)(config.db.master, chapter.$kind);
  })
  .then(function() {
    console.log('compacting member views in chapter database.');
    return d(server.db.compact)(chapterName, member.$kind);
  })
  .then(function() {
    console.log('compacting page views in chapter database.');
    return d(server.db.compact)(chapterName, page.$kind);
  })
  .then(function () {
    console.log('inserting chapter into master database.');
    var c = chapter.new({
      _id: 'republichog',
      name: 'Republic H.O.G.',
      domains: [ 'republichog.dev', 'republichog.com' ],
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
    console.log('inserting member into chapter database.');
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909beac',
      token: 'd80eb6666d354e1eacbce9e902bad430',
      email: 'curtis@schlak.com',
      login: 'cschlak',
      hogNumber: 'US12345678',
      password: 'lovely',
      firstName: 'Curtis',
      lastName: 'Schlak',
      nickName: 'The Saint',
      preferences: {
        directory: {
          email: true,
          address: true,
          phone: true
        }
      },
      phones: {
        mobile: '713-555-1212',
        home: '000-000-0000'
      },
      privileges: {
        canModifyMembers: true
      },
      address: {
        street: '123 Main Street',
        apartment: 'Apartment 47',
        city: 'Stafford',
        state: 'TX',
        zip: '77478'
      },
      photo: { type: 'image/jpeg', content: new Buffer('/9j/4AAQSkZJRgABAQAAAQABAAD//gA+Q1JFQVRPUjogZ2QtanBlZyB2MS4wICh1c2luZyBJSkcgSlBFRyB2NjIpLCBkZWZhdWx0IHF1YWxpdHkK/9sAQwAIBgYHBgUIBwcHCQkICgwUDQwLCwwZEhMPFB0aHx4dGhwcICQuJyAiLCMcHCg3KSwwMTQ0NB8nOT04MjwuMzQy/9sAQwEJCQkMCwwYDQ0YMiEcITIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy/8AAEQgAMgAyAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A5G2hcbieX6mteNJI3iaXY5I6fxAVejhSOJcqQxFTCN4bR7hmVIo8sSwz8vfjr+VduPrKPwu5nTx75lFaGF4lit73yIZiyCI8MpA+8B3PHp+Vcq2mn7ZJbW8ocK/DgZDV1F1Fqmp2styLG7NkoBJWFtuDwDkDnlccccUyDSNVto5Cuk3gigBeVWt2G0Dkkkjj/PXpXFQq04NJo7eeT1M2Kxe3tfs/8YO4+9WbaFxuJ5fqa2re0guYVuVc/N+ntVuOFI4lypDY5r3ZTgqSszz5Yr2cnbcorFe7Fw64x3oq95T9kfH0orzva+aD+05lyedIosqcvnAz2/xrP1i5k/sC5K5XAUnBznkf05/Coby+3ERbAQPwqfSdQS3vI2n2S24fDxOoZZBggqRjnIJH41pXwTdLmYfV1TaaPXNGvNKs9FsbSO/tMQ2yDHnL0CgZ6/rVyTVNMePa97asr5XBlUg+veqMmhWICzSTSCFbf7Ph3Xb5Rx8p46cDv+NOi0aweeK5tJSggaQxrCU2IX+9gYPXmvFO/U8p0S3hSPUo4pRIlteyRKyPkFeMEc4x1P41ZnnSKH5Tl84Ge3+NXdakX+1LmG2iRLeEiGPAGW2HacnvyD19vaucvL7cRFsBA/CvVwVN11y9jknhlOVzUSdyiny85HXzaKwftC5/1x/Oiun+z/Iy9h6FCK4N043KFOcEdavKnlzR7uNkgKn3H0rPtoXG4nl+9a8aSRvE0oVyw6fxYrTFV1GDgz041KbhySepr6hq1heanpEuvQTXFgtm8LJlihkXlTgdyCoPHf06VLTxDoWia5a6tpFnPZwRWbtcW6sSpmOVCnoCBkHIH8qoa9IkrQRF2jETA5ABU5A6hgQfy4/GuVuLe4uLuS1juBIok3AooCsfoOOM141Kg5vyFaPyNe31u7uZ55VQMNxKyMcEZpYbhrlxuUKc4IPNVIrGSC1Nv/GDuJ9as20LjcTy/evdpQVGHN1MqdS07y2RfNvg4yf++aKsLFe7Fw64x3NFP64js+tUu6+4mtgMdO1X7YAxtkDgce1FFeXme54tD42ZetgNaSZAPzHr9KxbNFFqrhQG8wc45oorbAfwonT9kuD/AI+PwrTtgNvTtRRXpV/4Jx1OpJmiiivCMj//2Q==', 'base64') },
      nationalMembership: {
        startedOn: new Date(2012, 8),
        expiresOn: null
      },
      localMembership: {
        startedOn: new Date(2013, 1),
        expiresOn: new Date(2013, 12)
      }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    console.log('inserting member into chapter database.');
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909bedd',
      token: '91ed1c672aa14d818088f8f3cbcc3ee5',
      email: 'leslie@schlak.com',
      login: 'lschlak',
      hogNumber: 'US87654321',
      password: 'lovelier',
      firstName: 'Leslie',
      lastName: 'Schlak',
      nickName: 'Stinger',
      preferences: {},
      phones: {
        home: '000-000-0000'
      },
      address: {
        street: '123 Main Street',
        apartment: 'Apartment 47',
        city: 'Stafford',
        state: 'TX',
        zip: '77478'
      },
      nationalMembership: {
        startedOn: new Date(2014, 1),
        expiresOn: new Date(2014, 12)
      },
      localMembership: {
        startedOn: new Date(2014, 1),
        expiresOn: new Date(2014, 12)
      }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    console.log('inserting member into chapter database.');
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909beee',
      token: 'f26ef52e7f384d95867e718943f2ed8c',
      email: 'isaac@schlak.com',
      login: 'ischlak',
      hogNumber: 'US88888888',
      password: 'zuck',
      firstName: 'Isaac',
      lastName: 'Schlak',
      preferences: {
        directory: {}
      },
      phones: {
        mobile: '713-555-1212',
      },
      nationalMembership: {
        startedOn: new Date(2002, 3),
        expiresOn: null
      },
      localMembership: {
        startedOn: new Date(2014, 1),
        expiresOn: new Date(2014, 12)
      }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    console.log('inserting member into chapter database.');
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909beff',
      token: '69205a6a874c4103b23bd09c61b5405b',
      email: 'lola@schlak.com',
      login: 'lola.schlak',
      hogNumber: 'US11111111',
      password: 'lovelier',
      firstName: 'Lola',
      lastName: 'Schlak',
      nickName: 'Doo Doo Bear',
      photo: { type: 'image/jpeg', content: new Buffer('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', 'base64') },
      nationalMembership: {
        startedOn: new Date(2009, 11),
        expiresOn: new Date(2012, 10)
      },
      localMembership: {
        startedOn: new Date(2010, 6),
        expiresOn: new Date(2014, 12)
      }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    console.log('inserting member into chapter database.');
    var m = member.new({
      _id: '24a359fba8f7c2099f413cf34909be12',
      token: '5211154c82324348a2362cb3e4b4ec14',
      email: 'gabby@burgard.com',
      login: 'gabby',
      hogNumber: 'US01010101',
      password: 'stinky',
      firstName: 'Gabrielle',
      lastName: 'Burgard',
      nickName: 'Stinky',
      nationalMembership: {
        startedOn: new Date(2009, 11),
        expiresOn: new Date(2012, 10)
      },
      localMembership: {
        startedOn: new Date(2010, 6),
        expiresOn: new Date(2014, 12)
      }
    });
    return d(m.to(chapterdb).save)();
  })
  .then(function() {
    console.log('inserting page into chapter database.');
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
    console.log('inserting page into chapter database.');
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
    console.log('got an error.');
    console.error('error', error);
  });

// chapter.to(masterdb).sync();
// member.to(chapterdb).sync();
// page.to(chapterdb).sync();
