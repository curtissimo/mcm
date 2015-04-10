var plan = require('flightplan');
var pluginsDir = '/mcm-haraka-plugins-' + new Date().getTime();

plan.target('staging', {
  host: '192.168.1.81',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_DB: 'http://localhost:5984'
});

plan.target('uat', {
  host: 'curweb2.curtissimo.com',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
}, {
  MCM_DB: 'http://192.168.180.173:5984'
});

plan.local(function (local) {
  local.log('Run distribution target.');
  local.exec('NODE_ENV=production gulp dist');
  local.exec('cp ./package.json ./dist');

  local.log('Copy files to remote hosts');
  var filesToCopy = local.exec('find ./dist -type f', { silent: true });
  local.transfer(filesToCopy, '/tmp' + pluginsDir);
  local.exec('rm -rf ./dist');
});

plan.remote(function (remote) {
  remote.log('Move inbound plugins and configuration to destination.');
  var fromFiles = '/tmp' + pluginsDir + '/dist/inbound/*';
  var to = '/var/www/mcm/inbound-smtp';
  remote.sudo('cp -R ' + fromFiles + ' ' + to, { user: 'curtis' });

  remote.log('Move outbound plugins and configuration to destination.');
  var fromFiles = '/tmp' + pluginsDir + '/dist/outbound/*';
  var to = '/var/www/mcm/outbound-smtp';
  remote.sudo('cp -R ' + fromFiles + ' ' + to, { user: 'curtis' });

  remote.log('Restart haraka.');
  var list = remote.sudo('pm2 list', { user: 'curtis' });
  var env = [
    [ 'MCM_DB', plan.runtime.options.MCM_DB ].join('=')
  ].join(' ');
  var outCmd = [
    'start',
    '/usr/lib/node_modules/Haraka/bin/haraka',
    '--name mcm-outbound-mail',
    '--',
    '-c ' + to
  ].join(' ');
  var inCmd = outCmd
    .replace(/outbound/g, 'inbound')
    .replace('/lib/node_modules/Haraka', '');
  if (list.stdout.indexOf('│ mcm-outbound-mail ') > -1) {
    outCmd = 're' + outCmd;
  }
  if (list.stdout.indexOf('│ mcm-inbound-mail ') > -1) {
    inCmd = 're' + inCmd;
  }
  remote.sudo(env + ' pm2 ' + outCmd + ' -u curtis', { user: 'curtis' });
  remote.sudo(env + ' pm2 ' + inCmd + ' -u curtis', { user: 'curtis' });
  remote.sudo(env + ' pm2 save -u curtis', { user: 'curtis' });
});
