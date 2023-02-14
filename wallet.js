#!/usr/bin/env node

process.title = 'gamegold-wallet';
// Uncaught exception handler
process.on('unhandledRejection', (err, promise) => {
  console.error(err);
});
process.on('uncaughtException', (err) => {
  console.error(` Caught exceptio n: ${err.stack}`);
});

const gamegold = require('gamegold');

/**
 * 对并发运行的节点组进行集中配置
 */
const nodes = [
  new gamegold.walletnode({
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
  }),
];

(async () => {
  for(let node of nodes) {
    await node.ensure();
    await node.open();
  }
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
