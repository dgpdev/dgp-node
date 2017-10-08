#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const dgpnode_stop = require('commander');

dgpnode_stop
  .description('stops the running share specified')
  .option('-i, --nodeid <nodeid>', 'id of the running share')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!dgpnode_stop.nodeid) {
  console.error('\n  missing node id, try --help');
  process.exit(1);
}

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_stop.remote) {
  address = dgpnode_stop.remote.split(':')[0];
  if (dgpnode_stop.remote.split(':').length > 1) {
    port = parseInt(dgpnode_stop.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.stop(dgpnode_stop.nodeid, (err) => {
    if (err) {
      console.error(`\n  cannot stop node, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * share ${dgpnode_stop.nodeid} stopped`);
    return sock.end();
  });
}, address);
