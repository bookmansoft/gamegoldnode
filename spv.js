#!/usr/bin/env node

'use strict';
process.title = 'gamegold';
// Uncaught exception handler
process.on('unhandledRejection', (err, promise) => {
  console.error(err);
});
process.on('uncaughtException', (err) => {
  console.error(` Caught exceptio n: ${err.stack}`);
});

if (process.argv.indexOf('--help') !== -1 || process.argv.indexOf('-h') !== -1) {
  console.error('See the wiki at: https://github.com/bookmanSoft/');
  process.exit(1);
  throw new Error('Could not exit.');
}

if (process.argv.indexOf('--version') !== -1 || process.argv.indexOf('-v') !== -1) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
  throw new Error('Could not exit.');
}

const gamegold = require('gamegold');
const spvnode = gamegold.spvnode;
const connector = require('./lib/remote/connector');

/**
 * 对并发运行的节点组进行集中配置
 */
const nodes = [
  new spvnode({
    network: 'testnet',
    config: true,
    argv: true,
    env: true,
    logFile: false,
    logConsole: true,
    logLevel: 'debug',
    db: 'leveldb',
    persistent: true,
    workers: false,
    listen: true,
    loader: require,
    plugins: [// 插件列表 2018.5.3 当前版本要求：钱包插件最后载入
      gamegold.wallet.plugin,     //钱包管理插件，可以在全节点或SPV节点加载
    ],
    seeds: [`127.0.0.1`],
    // mnemonic: {
    //   language: 'english',
    //   bits: 256,
    // },
  }),
];

(async () => {
  for(let node of nodes) {
    await node.bootstrap();
  }
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
