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
let producer = null;
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

  node.on('ca.issue', async msg => {
    if(enKafka) {
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }
  });
  
  node.on('ca.abolish', async msg => {
    if(enKafka) {
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }
  });

  node.on('ca.unissue', async msg => {
    if(enKafka) { 
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }
  });
  
  node.on('ca/unabolish', async msg => {
    if(enKafka) { 
      producer.send({
        topic: kafka.extraParams.topic,
        messages: [
          { value: JSON.stringify(msg) },
        ],
      }).catch(e=>{});
    }    
  });

  //#region 添加可信信道

  let hopes = [], $time = 5000;
  if(node.config.args.only) {
    for(let it of node.config.args.only.split(',')) {
      let env = it.split(':');
      if(env.length == 2) {
        hopes.push({conn: it, connect: false, type: node.network.type, ip: env[0], port: parseInt(env[1]) + 2});
      }
    }
  } else if(node.config.args.nodes) {
    for(let it of node.config.args.nodes.split(',')) {
      let env = it.split(':');
      if(env.length == 2) {
        hopes.push({conn: it, connect: false, type: node.network.type, ip: env[0], port: parseInt(env[1]) + 2});
      }
    }
  }

  let remoteConn = async () => {
    for(let it of hopes) {
      if(it.connect) {
        continue;
      }

      const remote = connector({
        type: it.type,
        ip: it.ip,
        port: it.port,
      });

      let ret = await remote.execute('aliance.token', []);
      if(!!ret && !ret.error) {
        it.connect = true;
        node.rpc._addPeer([it.conn, ret.pub]).catch(e=>{
          node.logger.error(e);
        });
      } else {
        $time += 3000;
        setTimeout(remoteConn, $time);
      }
    }
  } 
  await remoteConn();

  //#endregion

  //#region 建立kafka连接
  if(enKafka) { 
    let $ktime = 30000;
    producer = kafka.producer();
    let connecting = async () => {
      producer.connect().catch(err => {
        $ktime += 3000;
        setTimeout(connecting, $ktime);
      });
    } 

    await connecting();

    producer.on(producer.events.DISCONNECT, e => { //断线重连
      $ktime = 30000;
      connecting();
    });
  }
  
  //#endregion
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
