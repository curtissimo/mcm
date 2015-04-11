import nodemailer from 'nodemailer';

let transporter = nodemailer.createTransport({
  debug: true,
  port: 25,
  host: 'web-server'
});

transporter.on('log', function (chunk) {
  console.log(chunk.type + ':', chunk.message.replace(/\n/g, '\n        '));
});

let test = () => {
  transporter.sendMail({
    from: '"Curtis Schlak" <curtis@schlak.com>',
    to: [ 'Webmaster@republichog.org', 'bob@bob.com' ],
    subject: 'Hey, guys, what\'s going on?',
    text: 'Goo!',
    html: 'Poo!',
    messageId: `<2938492.${new Date().valueOf()}@schlak.com>`
  });

  transporter.sendMail({
    from: '"Curtis Schlak" <curtis@schlak.com>',
    sender: '"Marcus Welby" <marcus@welby.com>',
    replyTo: '"Jack Sprat" <jack@sprat.gov>',
    to: [ 'BossRC@RepublicHOG.org' ],
    subject: 'I want to ride!!!!',
    text: 'Goo!',
    messageId: `<2938492.${new Date().valueOf()}@schlak.com>`
  });

  transporter.sendMail({
    from: '"Curtis Schlak" <curtis@schlak.com>',
    to: [ '"Republic HOG Webmaster" <Webmaster@republichog.org>', 'Director@RepublicHOG.org', '"Bob Boberts" bob@bob.com' ],
    subject: 'HTML only scares me',
    html: 'Goo!',
    replyTo: '"Mailing List" <mail-list@schlak.com>',
    messageId: `<2938492.${new Date().valueOf()}@schlak.com>`,
    references: [
      '<2938492.1428748520005@schlak.com>\n',
      '<2938492.1428748520007@schlak.com>\n'
    ]
  });
};

export default test;
