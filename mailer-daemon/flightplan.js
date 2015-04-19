var plan = require('flightplan');
var tmpDir = 'mailer-daemon-' + new Date().getTime();

plan.target('staging', {
  host: '192.168.1.81',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_MAIL_HOST: 'localhost',
  MCM_DB: 'http://localhost:5984',
  MCM_RABBIT_URL: 'amqp://localhost'
});

plan.target('uat', {
  host: 'curweb2.curtissimo.com',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_MAIL_HOST: 'localhost',
  MCM_DB: 'http://192.168.180.173:5984',
  MCM_RABBIT_URL: 'amqp://localhost'
});

plan.local(function (local) {
  local.log('Run build');
  local.exec('NODE_ENV=production gulp dist');
  local.exec('cp ./package.json ./dist');
  local.exec('mv ./dist/app.js ./dist/mcm-mailer-daemon.js');

  local.log('Copy files to remote hosts');
  var filesToCopy = local.exec('find ./dist -type f', { silent: true });
  local.transfer(filesToCopy, '/tmp/' + tmpDir);
  local.exec('rm -rf ./dist');
});

plan.remote(function (remote) {
  var fromDir = '/tmp/' + tmpDir;
  var from = fromDir + '/dist';
  var to = '/var/www/mcm/' + tmpDir;
  remote.log('Move folder to web root');
  remote.sudo('mkdir -p ' + to, { user: 'curtis' });
  remote.sudo('cp -R ' + from + '/. ' + to, { user: 'curtis' });
  remote.sudo('rm -rf ' + fromDir, { user: 'curtis' });

  remote.log('Install dependencies');
  remote.sudo('npm --production --prefix ' + to + ' install ' + to, { user: 'curtis' });

  remote.log('Link the file to the serve directory');
  remote.sudo('ln -snf ' + to + ' /var/www/mcm/mailer-daemon.live', { user: 'curtis' });

  remote.log('Reload application');
  var list = remote.sudo('pm2 list', { user: 'curtis' });
  var env = [
    [ 'MCM_DB', plan.runtime.options.MCM_DB ].join('='),
    [ 'MCM_MAIL_HOST', plan.runtime.options.MCM_MAIL_HOST ].join('='),
    [ 'MCM_RABBIT_URL', plan.runtime.options.MCM_RABBIT_URL ].join('='),
  ].join(' ');
  var command = 'start /var/www/mcm/mailer-daemon.live/mcm-mailer-daemon.js';
  if (list.stdout.indexOf('│ mcm-mailer-daemon ') > -1) {
    command = 'restart mcm-mailer-daemon';
  }
  remote.sudo(env + ' pm2 ' + command + ' -u curtis', { user: 'curtis' });
  remote.sudo(env + ' pm2 save -u curtis', { user: 'curtis' });
});
