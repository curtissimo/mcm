var plan = require('flightplan');
var tmpDir = 'mcm-' + new Date().getTime();

plan.target('staging', {
  host: '192.168.1.81',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
});

plan.target('uat', {
  host: 'curweb2.curtissimo.com',
  username: 'curtis',
  agent: process.env.SSH_AUTH_SOCK
});

plan.local(function (local) {
  local.log('Run build');
  local.exec('NODE_ENV=production gulp dist');
  local.exec('cp ./package.json ./dist');
  local.exec('mkdir -p ./dist/{public,tmp,files}');

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
  remote.sudo('mkdir -p ' + to + '/files', { user: 'curtis' });
  remote.sudo('rm -rf ' + fromDir, { user: 'curtis' });

  remote.log('Install dependencies');
  remote.sudo('npm --production --prefix ' + to + ' install ' + to, { user: 'curtis' });

  remote.log('Link the file to the serve directory');
  remote.sudo('ln -snf ' + to + ' /var/www/mcm/mcm.live', { user: 'curtis' });

  remote.log('Reload application');
  remote.exec('mkdir -p /var/www/mcm/mcm.live/tmp');
  remote.exec('touch /var/www/mcm/mcm.live/tmp/restart.txt');
});