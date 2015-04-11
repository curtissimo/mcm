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
    from: 'Curtis Schlak <curtis@schlak.com>',
    to: [ 'Webmaster@republichog.org', 'Director@RepublicHOG.org', 'bob@bob.com' ],
    subject: 'Hey, guys, what\'s going on?',
    text: 'Goo!',
    html: 'Poo!',
    messageId: `<2938492.${new Date().valueOf()}@schlak.com>`
  });
};

export default test;