#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const dgpnode_load = require('commander');

dgpnode_load
  .description('loads a snapshot of shares and starts all of them')
  .option('-s, --snapshot <path>', 'path to load the snapshot file')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!dgpnode_load.snapshot) {
  dgpnode_load.snapshot = path.join(
    os.homedir(),
    '.config/dgpnode/snapshot'
  );
}

if (!path.isAbsolute(dgpnode_load.snapshot)) {
  dgpnode_load.snapshot = path.join(process.cwd(),
                                       dgpnode_load.snapshot);
}

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_load.remote) {
  address = dgpnode_load.remote.split(':')[0];
  if (dgpnode_load.remote.split(':').length > 1) {
    port = parseInt(dgpnode_load.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.load(dgpnode_load.snapshot, (err) => {
    if (err) {
      console.error(`\n  cannot load snapshot, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * snapshot ${dgpnode_load.snapshot} loaded`);
    sock.end();
  });
}, address);
