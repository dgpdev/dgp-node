#!/usr/bin/env node

'use strict';

const blindfold = require('blindfold');
const editor = require('editor');
const {homedir} = require('os');
const fs = require('fs');
const storj = require('storj-lib');
const path = require('path');
const mkdirp = require('mkdirp');
const stripJsonComments = require('strip-json-comments');
const dgpnode_create = require('commander');
const {execSync} = require('child_process');
const utils = require('../lib/utils');
const touch = require('touch');

const defaultConfig = JSON.parse(stripJsonComments(fs.readFileSync(
  path.join(__dirname, '../example/farmer.config.json')
).toString()));

function whichEditor() {

  const editors = ['vi', 'nano'];

  function checkIsInstalled(editor) {
    try {
      execSync('which ' + editor);
    } catch (err) {
      return false;
    }

    return true;
  }

  for (let i = 0; i < editors.length; i++) {
    if (checkIsInstalled(editors[i])) {
      return editors[i];
    }
  }

  return null;
}

dgpnode_create
  .description('generates a new share configuration')
  .option('--storj <addr>', 'specify the STORJ address (required)')
  .option('--key <privkey>', 'specify the private key')
  .option('--storage <path>', 'specify the storage path')
  .option('--size <maxsize>', 'specify share size (ex: 10GB, 1TB)')
  .option('--rpcport <port>', 'specify the rpc port number')
  .option('--rpcaddress <addr>', 'specify the rpc address')
  .option('--maxtunnels <tunnels>', 'specify the max tunnels')
  .option('--tunnelportmin <port>', 'specify min gateway port')
  .option('--tunnelportmax <port>', 'specify max gateway port')
  .option('--manualforwarding', 'do not use nat traversal strategies')
  .option('--verbosity <verbosity>', 'specify the logger verbosity')
  .option('--logdir <path>', 'specify the log directory')
  .option('--noedit', 'do not open generated config in editor')
  .option('-o, --outfile <writepath>', 'write config to path')
  .parse(process.argv);

if (!dgpnode_create.storj) {
  console.error('\n  no payment address was given, try --help');
  process.exit(1);
}

if (!utils.isValidEthereumAddress(dgpnode_create.storj)) {
  console.error('\n SJCX addresses are no longer supported. \
Please enter ERC20 compatible ETH wallet address');
  process.exit(1);
}

if (!dgpnode_create.key) {
  dgpnode_create.key = storj.KeyPair().getPrivateKey();
}

if (!dgpnode_create.storage) {
  dgpnode_create.storage = path.join(
    homedir(),
    '.config/dgpnode/shares',
    storj.KeyPair(dgpnode_create.key).getNodeID()
  );
  mkdirp.sync(dgpnode_create.storage);
}

if (!dgpnode_create.outfile) {
  const configDir = path.join(homedir(), '.config/dgpnode/configs');
  dgpnode_create.outfile = path.join(
    configDir, storj.KeyPair(dgpnode_create.key).getNodeID() + '.json'
  );
  mkdirp.sync(configDir);
  touch.sync(dgpnode_create.outfile);
}

if (!dgpnode_create.logdir) {
  dgpnode_create.logdir = path.join(
    homedir(),
    '.config/dgpnode/logs'
  );
  mkdirp.sync(dgpnode_create.logdir);
}

if (dgpnode_create.size &&
    !dgpnode_create.size.match(/[0-9]+(T|M|G|K)?B/g)) {
  console.error('\n Invalid storage size specified: '+
                dgpnode_create.size);
  process.exit(1);
}

let exampleConfigPath = path.join(__dirname, '../example/farmer.config.json');
let exampleConfigString = fs.readFileSync(exampleConfigPath).toString();

function getDefaultConfigValue(prop) {
  return {
    value: blindfold(defaultConfig, prop),
    type: typeof blindfold(defaultConfig, prop)
  };
}

function replaceDefaultConfigValue(prop, value) {
  let defaultValue = getDefaultConfigValue(prop);

  function toStringReplace(prop, value, type) {
    switch (type) {
      case 'string':
        value = value.split('\\').join('\\\\'); // NB: Hack windows paths
        return`"${prop}": "${value}"`;
      case 'boolean':
      case 'number':
        return `"${prop}": ${value}`;
      default:
        return '';
    }
  }

let validVerbosities = new RegExp(/^[0-4]$/);
if (dgpnode_create.verbosity &&
  !validVerbosities.test(dgpnode_create.verbosity)) {
  console.error('\n  * Invalid verbosity.\n  * Accepted values: 4 - DEBUG | \
3 - INFO | 2 - WARN | 1 - ERROR | 0 - SILENT\n  * Default value of %s \
will be used.', getDefaultConfigValue('loggerVerbosity').value);
  dgpnode_create.verbosity = null;
}

  prop = prop.split('.').pop();
  exampleConfigString = exampleConfigString.replace(
    toStringReplace(prop, defaultValue.value, defaultValue.type),
    toStringReplace(prop, value, defaultValue.type)
  );
}

replaceDefaultConfigValue('paymentAddress', dgpnode_create.storj);
replaceDefaultConfigValue('networkPrivateKey', dgpnode_create.key);
replaceDefaultConfigValue('storagePath',
                          path.normalize(dgpnode_create.storage));
replaceDefaultConfigValue('loggerOutputFile',
                          path.normalize(dgpnode_create.logdir));

const optionalReplacements = [
  { option: dgpnode_create.size, name: 'storageAllocation' },
  { option: dgpnode_create.rpcaddress, name: 'rpcAddress' },
  { option: dgpnode_create.rpcport, name: 'rpcPort' },
  { option: dgpnode_create.maxtunnels, name: 'maxTunnels' },
  { option: dgpnode_create.tunnelportmin, name: 'tunnelGatewayRange.min' },
  { option: dgpnode_create.tunnelportmax, name: 'tunnelGatewayRange.max' },
  { option: dgpnode_create.manualforwarding, name: 'doNotTraverseNat' },
  { option: dgpnode_create.verbosity, name: 'loggerVerbosity' }
];

optionalReplacements.forEach((repl) => {
  if (repl.option) {
    replaceDefaultConfigValue(repl.name, repl.option);
  }
});

let outfile = path.isAbsolute(dgpnode_create.outfile) ?
                path.normalize(dgpnode_create.outfile) :
                path.join(process.cwd(), dgpnode_create.outfile);

try {
  fs.writeFileSync(outfile, exampleConfigString);
} catch (err) {
  console.log (`\n  failed to write config, reason: ${err.message}`);
  process.exit(1);
}

console.log(`\n  * configuration written to ${outfile}`);

if (!dgpnode_create.noedit) {
  console.log('  * opening in your favorite editor to tweak before running');
  editor(outfile, {
    // NB: Not all distros ship with vim, so let's use GNU Nano
    editor: process.platform === 'win32'
            ? null
            : whichEditor()
  }, () => {
    console.log('  ...');
    console.log(`  * use new config: dgpnode start --config ${outfile}`);
  });
}
