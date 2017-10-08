#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const dgpnode_destroy = require('commander');

dgpnode_destroy
  .description('stops a running share and removes it from status')
  .option('-i, --nodeid <nodeid>', 'id of the managed share')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!dgpnode_destroy.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_destroy.remote) {
  address = dgpnode_destroy.remote.split(':')[0];
  if (dgpnode_destroy.remote.split(':').length > 1) {
    port = parseInt(dgpnode_destroy.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.destroy(dgpnode_destroy.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot destroy node, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * share ${dgpnode_destroy.nodeid} destroyed`);
    sock.end();
  });
}, address);
