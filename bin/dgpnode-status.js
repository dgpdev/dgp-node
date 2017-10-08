#!/usr/bin/env node

'use strict';

const prettyMs = require('pretty-ms');
const config = require('../lib/config/daemon');
const utils = require('../lib/utils');
const Table = require('cli-table');
const colors = require('colors/safe');
const dgpnode_status = require('commander');

dgpnode_status
  .description('prints the status of all managed shares')
  .option('-r, --remote <hostname:port>',
    'hostname and optional port of the daemon')
  .option('-j, --json',
    'JSON formatted status of all managed shares')
  .parse(process.argv);

function getColoredValue(status, value) {
  switch (status) {
    case 0:
      return colors.green(value);
    case 1:
      return colors.yellow(value);
    case 2:
      return colors.red(value);
    default:
      return value;
  }
}

function fixContractValue(contractCount) {
  contractCount = contractCount || 0;
  if (contractCount > 99999999) {
    return '>99999999';
  }
  return contractCount;
}

let port = config.daemonRpcPort;
let address = null;
if (dgpnode_status.remote) {
  address = dgpnode_status.remote.split(':')[0];
  if (dgpnode_status.remote.split(':').length > 1) {
    port = parseInt(dgpnode_status.remote.split(':')[1], 10);
  }
}

// Prepare json formatted status for each share
function prepareJson(shares) {
  /*jshint maxcomplexity:11 */
  /*jshint maxstatements:23 */
  let json = [];

  for (let i = 0; i < shares.length; i++) {
    let share = shares[i];

    json[i] = {};
    json[i].id = share.id;

    let status = '?';

    switch (share.state) {
      case 0:
        status = 'stopped';
        break;
      case 1:
        status = 'running';
        break;
      case 2:
        status = 'errored';
        break;
      default:
        status = 'unknown';
    }

    json[i].status = status;
    json[i].configPath = share.config.storagePath;
    json[i].uptime = prettyMs(share.meta.uptimeMs);
    json[i].restarts = share.meta.numRestarts || 0;
    json[i].peers = share.meta.farmerState.totalPeers || 0;
    json[i].offers = fixContractValue(
      share.meta.farmerState.contractCount
    );
    json[i].dataReceivedCount = fixContractValue(
      share.meta.farmerState.dataReceivedCount
    );
    json[i].delta = share.meta.farmerState.ntpStatus.delta;
    json[i].port = share.meta.farmerState.portStatus.listenPort;
    json[i].shared = share.meta.farmerState.spaceUsed;
    json[i].sharedPercent = share.meta.farmerState.percentUsed;

    var bridgeCxStat = share.meta.farmerState.bridgesConnectionStatus;
    switch (bridgeCxStat) {
      case 0:
        json[i].bridgeConnectionStatus = 'disconnected';
        break;
      case 1:
        json[i].bridgeConnectionStatus = 'connecting';
        break;
      case 2:
        json[i].bridgeConnectionStatus = 'confirming';
        break;
      case 3:
        json[i].bridgeConnectionStatus = 'connected';
        break;
      default:
        break;
    }
  }

  return JSON.stringify(json);
}

utils.connectToDaemon(port, function(rpc, sock) {
  /*jshint maxcomplexity:10 */
  rpc.status(function(err, shares) {
    if (dgpnode_status.json) {
      // Print out json formatted share statuses
      const json = prepareJson(shares);
      console.log(json);
    } else {
      let table = new Table({
        head: ['Share', 'Status', 'Uptime', 'Restarts', 'Peers',
          'Offers', 'Delta', 'Port', 'Shared', 'Bridges'],
        style: {
          head: ['cyan', 'bold'],
          border: []
        },
        colWidths: [45, 9, 10, 10, 9, 15, 9, 10, 11, 14]
      });
      shares.forEach((share) => {
        let status = '?';

        switch (share.state) {
          case 0:
            status = colors.gray('stopped');
            break;
          case 1:
            status = colors.green('running');
            break;
          case 2:
            status = colors.red('errored');
            break;
          default:
            status = 'unknown';
        }

        let portStatus = share.meta.farmerState.portStatus;
        let port = getColoredValue(portStatus.connectionStatus,
           portStatus.listenPort);
        let connectionType =  getColoredValue(portStatus.connectionStatus,
          portStatus.connectionType);

        let ntpStatus = getColoredValue(share.meta.farmerState.ntpStatus.status,
          share.meta.farmerState.ntpStatus.delta);

        let contracts = fixContractValue(share.meta.farmerState.contractCount);
        let dataReceived = fixContractValue(
          share.meta.farmerState.dataReceivedCount);

        var bridgeCxStat = share.meta.farmerState.bridgesConnectionStatus;
        var bridgeCxString = '...';
        switch (bridgeCxStat) {
          case 0:
            bridgeCxString = colors.gray('disconnected');
            break;
          case 1:
            bridgeCxString = colors.yellow('connecting');
            break;
          case 2:
            bridgeCxString = colors.orange('confirming');
            break;
          case 3:
            bridgeCxString = colors.green('connected');
            break;
          default:
            break;
        }

        table.push([
          `${share.id}\n  → ${share.config.storagePath}`,
          status,
          prettyMs(share.meta.uptimeMs),
          share.meta.numRestarts || 0,
          share.meta.farmerState.totalPeers || 0,
          contracts + '\n' + `${dataReceived} received`,
          ntpStatus,
          port + '\n' + connectionType,
          share.meta.farmerState.spaceUsed + '\n' +
            `(${share.meta.farmerState.percentUsed}%)`,
          bridgeCxString
        ]);
      });
      console.log('\n' + table.toString());
    }
    sock.end();
  });
}, address);
