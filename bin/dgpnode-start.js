#!/usr/bin/env node

'use strict';

const {spawn} = require('child_process');
const utils = require('../lib/utils');
const path = require('path');
const config = require('../lib/config/daemon');
const dgpnode_start = require('commander');

dgpnode_start
  .description('starts a new network share')
  .option('-c, --config <path>', 'specify the configuration path')
  .option('-d, --detached', 'run share without management from daemon')
  .option('-u, --unsafe', 'ignore system resource guards')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!dgpnode_start.config) {
  console.error('\n  no config file was given, try --help');
  process.exit(1);
}

const configPath = path.isAbsolute(dgpnode_start.config) ?
                     path.normalize(dgpnode_start.config) :
                     path.join(process.cwd(), dgpnode_start.config);

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_start.remote) {
  address = dgpnode_start.remote.split(':')[0];
  if (dgpnode_start.remote.split(':').length > 1) {
    port = parseInt(dgpnode_start.remote.split(':')[1], 10);
  }
}

function runDetachedShare() {
  const scriptPath = path.join(__dirname, '../script/farmer.js');
  const shareProc = spawn(scriptPath, ['--config', configPath]);

  process.stdin.pipe(shareProc.stdin);
  shareProc.stdout.pipe(process.stdout);
  shareProc.stderr.pipe(process.stderr);
  shareProc.on('exit', (code) => process.exit(code));
}

function runManagedShare() {
  utils.connectToDaemon(port, function(rpc, sock) {
    rpc.start(configPath, (err) => {
      if (err) {
        console.error(`\n  failed to start share, reason: ${err.message}`);
        return sock.end();
      }
      console.info(`\n  * starting share with config at ${configPath}`);
      sock.end();
    }, dgpnode_start.unsafe);
  }, address);
}

if (dgpnode_start.detached) {
  runDetachedShare();
} else {
  runManagedShare();
}
