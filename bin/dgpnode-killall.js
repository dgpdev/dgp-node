#!/usr/bin/env node

'use strict';

const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const dgpnode_killall = require('commander');

dgpnode_killall
  .description('destroys all running shares and stop daemon')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .parse(process.argv);

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_killall.remote) {
  address = dgpnode_killall.remote.split(':')[0];
  if (dgpnode_killall.remote.split(':').length > 1) {
    port = parseInt(dgpnode_killall.remote.split(':')[1], 10);
  }
}

utils.connectToDaemon(port, function(rpc, sock) {
  sock.on('end', () => console.info('\n  * daemon has stopped'));
  rpc.killall(() => sock.end());
}, address);
