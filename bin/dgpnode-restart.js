#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const dgpnode_restart = require('commander');

dgpnode_restart
  .description('restarts the running share specified')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .option('-a, --all', 'restart all running shares')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!dgpnode_restart.nodeid && !dgpnode_restart.all) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_restart.remote) {
  address = dgpnode_restart.remote.split(':')[0];
  if (dgpnode_restart.remote.split(':').length > 1) {
    port = parseInt(dgpnode_restart.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  if (dgpnode_restart.all) {
    console.info('\n  * restarting all managed shares');
  }

  rpc.restart(dgpnode_restart.nodeid || '*', (err) => {
    if (err) {
      console.error(`\n  cannot restart node, reason: ${err.message}`);
      return sock.end();
    }

    if (dgpnode_restart.nodeid) {
      console.info(`\n  * share ${dgpnode_restart.nodeid} restarted`);
    } else {
      console.info('\n  * all shares restarted successfully');
    }

    sock.end();
  });
}, address);
