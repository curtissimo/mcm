var path = require('path');
var plan = require('flightplan');
var moment = require('moment');
var tmp = 'mcm-' + moment().format('YY-MM-DD.HHmm');
var destDir = '/var/www/mcm';
var fullTmp = path.join(destDir, tmp);
var live = path.join(destDir, 'mcm.live');

function shellenv() {
  return [
    [ 'MCM_DB', plan.runtime.options.MCM_DB ].join('='),
    [ 'MCM_MAIL_HOST', plan.runtime.options.MCM_MAIL_HOST ].join('='),
    [ 'MCM_RABBIT_URL', plan.runtime.options.MCM_RABBIT_URL ].join('='),
    [ 'NODE_ENV', plan.runtime.options.NODE_ENV ].join('='),
    [ 'DOMAIN', plan.runtime.options.DOMAIN ].join('=')
  ].join(' ');
}

plan.target('staging', {
  host: 'web-server',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_MAIL_HOST: 'localhost',
  MCM_DB: 'http://couchdb:5984',
  MCM_RABBIT_URL: 'amqp://mcm:ZA7afnbQsxq4YJ@localhost',
  NODE_ENV: 'staging',
  DOMAIN: 'rhog.ismymc.dev'
});

plan.target('uat', {
  host: 'curweb2.curtissimo.com',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_MAIL_HOST: 'localhost',
  MCM_DB: 'http://192.168.180.173:5984',
  MCM_RABBIT_URL: 'amqp://mcm:RZZbbB6FjRBcG7@localhost',
  NODE_ENV: 'uat',
  DOMAIN: 'beta.republichog.org'
});

plan.target('production', {
  host: 'curweb2.curtissimo.com',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_MAIL_HOST: 'localhost',
  MCM_DB: 'http://192.168.180.173:5984',
  MCM_RABBIT_URL: 'amqp://mcm:RZZbbB6FjRBcG7@localhost',
  NODE_ENV: 'production',
  DOMAIN: 'republichog.org'
});

plan.local(function (local) {
  local.log('Clean build.');
  local.exec('gulp clean');

  local.log('Run distribution target');
  local.exec(shellenv() + ' gulp dist');
  local.exec('cp ./package.json ./dist');

  /* NO LONGER SYNCING FILES */
  // local.log('Syncing chapter files to destination');
  // var cwd = path.join(process.cwd(), 'src', 'sites');
  // var filesToCopy = local.exec('find files -type f', { silent: true, exec: { cwd: cwd } });
  // local.transfer(filesToCopy, destDir, { exec: { cwd: cwd } });

  local.log('Removing chapter files from distribution');
  local.exec('rm -rf ./dist/sites/files');

  local.log('Copy application files to remote hosts');
  cwd = path.join(process.cwd(), 'dist');
  var filesToCopy = local.exec('find . -type f', { silent: true, exec: { cwd: cwd } });
  local.transfer(filesToCopy, fullTmp, { exec: { cwd: cwd } });
});

plan.remote(function (remote) {
  remote.log('Installing dependencies');
  remote.sudo('npm --production --prefix ' + fullTmp + ' install ' + fullTmp, { user: 'curtis' });

  remote.log('Shutting down remote services.');
  remote.sudo('pm2 stop all', { user: 'curtis', failsafe: true });

  remote.log('Copy queued messages to new folder.');
  remote.sudo('mkdir -p ' + fullTmp + '/haraka/outbound/queue', { user: 'curtis' });
  remote.sudo('mv ' + live + '/haraka/outbound/queue/* ' + fullTmp + '/haraka/outbound/queue/', { user: 'curtis', failsafe: true });

  remote.log('Link the upload to the serve directory');
  remote.sudo('ln -snf ' + fullTmp + ' ' + live, { user: 'curtis' });

  remote.log('Link the node_modules to each haraka directory');
  remote.sudo('ln -snf ' + fullTmp + '/node_modules ' + fullTmp + '/haraka/inbound/node_modules', { user: 'curtis' });
  remote.sudo('ln -snf ' + fullTmp + '/node_modules ' + fullTmp + '/haraka/outbound/node_modules', { user: 'curtis' });

  // var inbound = path.join(live, 'haraka', 'inbound');
  // var inboundStart = path.join(inbound, 'inbound-start.sh');
  // var outbound = path.join(live, 'haraka', 'outbound');
  // var outboundStart = path.join(outbound, 'outbound-start.sh');
  // var mailer = path.join(live, 'mailer-daemon');
  // var mailerDaemon = path.join(mailer, 'app.js');

  remote.log('Restart the services.');
  remote.sudo(shellenv() + ' pm2 restart all', { user: 'curtis' });

  // remote.log('Start the mail infrastructure.');
  // remote.sudo(shellenv() + ' pm2 restart inbound-start', { user: 'curtis' });
  // remote.sudo(shellenv() + ' pm2 restart outbound-start', { user: 'curtis' });
  // remote.sudo(shellenv() + ' pm2 restart app', { user: 'curtis' });
  // remote.sudo(shellenv() + ' pm2 save', { user: 'curtis' });

  /* NO LONGER UPDATE NGINX */
  // var d = plan.runtime.options.DOMAIN;
  // var fromD = path.join(live, d);
  // remote.log('Configure nginx');
  remote.exec('mkdir -p ' + live + '/sites/tmp/', { user: 'curtis' });
  remote.exec('touch ' + live + '/sites/tmp/restart.txt', { user: 'curtis' });
  // remote.sudo('cp ' + fromD + ' /etc/nginx/sites-available', { user: 'curtis' });
  // remote.sudo('rm -f /etc/nginx/sites-enabled/' + d, { user: 'curtis' });
  // remote.sudo('ln -snf /etc/nginx/sites-available/' + d + ' /etc/nginx/sites-enabled/' + d, { user: 'curtis' });
  remote.exec('sudo /usr/sbin/nginx -s reload', { user: 'curtis', exec: { pty: true } });
});
