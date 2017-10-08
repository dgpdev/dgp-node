#!/usr/bin/env node

'use strict';

const os = require('os');
const path = require('path');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const dgpnode_save = require('commander');

dgpnode_save
  .description('saves a snapshot of shares')
  .option('-s, --snapshot <path>', 'path to write the snapshot file')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

if (!dgpnode_save.snapshot) {
  dgpnode_save.snapshot = path.join(
    os.homedir(),
    '.config/dgpnode/snapshot'
  );
}

if (!path.isAbsolute(dgpnode_save.snapshot)) {
  dgpnode_save.snapshot = path.join(process.cwd(),
                                       dgpnode_save.snapshot);
}

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_save.remote) {
  address = dgpnode_save.remote.split(':')[0];
  if (dgpnode_save.remote.split(':').length > 1) {
    port = parseInt(dgpnode_save.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  rpc.save(dgpnode_save.snapshot, (err) => {
    if (err) {
      console.error(`\n  cannot save snapshot, reason: ${err.message}`);
      return sock.end();
    }
    console.info(`\n  * snapshot ${dgpnode_save.snapshot} saved`);
    sock.end();
  });
}, address);
