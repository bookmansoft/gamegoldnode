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
const startproxy = require('./lib/proxy/startproxy');
const FullNode = gamegold.fullnode;
const kafka = require('./lib/kafka/connector');
const connector = require('./lib/remote/connector');

const node = new FullNode({
  config: true, // 是否载入外部配置文件
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
  plugins: [ // 2018.5.3 当前版本要求：钱包插件最后载入
    gamegold.stratum,           //矿场管理插件，只能在全节点加载
    gamegold.contractPlugin,    //合约账户管理插件，可以在全节点加载
    gamegold.wallet.plugin,     //钱包管理插件，可以在全节点或SPV节点加载
  ],
  // mnemonic: {
  //   passphrase: 'bookmansoft',
  //   language: 'english',
  //   bits: 256,
  // },
});

(async () => {
  /**
   * 当前结点是一个全功能节点，提供如下功能：
   * 1、一个通常意义上的全节点服务器
   * 2、提供基于WS的代理服务，负责 websocket 到 tcpsocket 的桥接
   */

  //#region 启动全节点程序

  await node.ensure();
  await node.open();

  const wdb = node.require('walletdb');
  if (wdb) {

    wdb.on('prop/receive', msg => {
      //console.log('prop/receive:', msg);
    });

    wdb.on('prop/auction', msg => {
      //console.log('prop/auction:', msg);
    });

    wdb.on('cp/orderPay', msg => {
      //console.log('cp/orderPay:', msg);
    });

    wdb.on('balance.client', msg => {
      //console.log('balance.client', msg);
    });
  }

  await node.connect();
  node.startSync();
  
  const enKafka = node.config.args.kafka;

  //通过传入 true/false 开启/关闭挖矿
  await node.rpc.execute({method:'miner.set.admin',params:[false]});

  if(node.miner && (!node.miner.addresses || node.miner.addresses.length==0)) {
    await node.rpc.execute({method:'miner.setsync.admin',params:[]});
    await node.rpc.execute({method:'miner.setaddr.admin',params:[]});
  }

  //#region 建立代理服务
  startproxy({
    node: node, 
    pow: process.argv.indexOf('--pow') !== -1,
    ports: [2000, 2100],
  });
  //#endregion

  node.on('ca.issue', msg => {
    console.log('ca.issue', msg, enKafka, kafka.extraParams.topic);
    
    if(enKafka) {
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }
  });
  
  node.on('ca.abolish', msg => {
    if(enKafka) {
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }
  });

  node.on('ca.unissue', msg => {
    if(enKafka) { 
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }
  });
  
  node.on('ca/unabolish', msg => {
    if(enKafka) { 
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }    
  });

  if(node.config.args.only) {
    let list = node.config.args.only.split(',');
    for(let it of list) {
      let env = it.split(':');

      const remote = connector({
        type: node.network.type,
        ip: env[0],
        port: parseInt(env[1]) + 2,
      });
      let ret = await remote.execute('aliance.token', []);
      await node.rpc.addPeer([it, ret.pub]);
    }
  } else if(node.config.args.nodes) {
    let list = node.config.args.nodes.split(',');
    for(let it of list) {
      let env = it.split(':');

      const remote = connector({
        type: node.network.type,
        ip: env[0],
        port: parseInt(env[1]) + 2,
      });
      let ret = await remote.execute('aliance.token', []);
      await node.rpc.addPeer([it, ret.pub]);
    }
  }

  //#region 建立kafka连接
  if(enKafka) { 
    const producer = kafka.producer();
    let connecting = async () => {
      producer.connect().catch(err => {
        setTimeout(connecting, 5000);
      });
    } 

    await connecting();

    producer.on(producer.events.DISCONNECT, e => { //断线重连
      connecting();
    });
  }
  //#endregion
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
