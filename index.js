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
  //throw new Error('Could not exit.');
}

if (process.argv.indexOf('--version') !== -1 || process.argv.indexOf('-v') !== -1) {
  const pkg = require('../package.json');
  console.log(pkg.version);
  process.exit(0);
  //throw new Error('Could not exit.');
}

const gamegold = require('gamegold');
const startproxy = require('./lib/proxy/startproxy');
const webstatic = require('./lib/proxy/webstatic');
const FullNode = gamegold.fullnode;
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
  //wshost,      //当前节点提供代理服务的守护地址, 采用行命令传入！！！注意需使用内网地址而非外网地址
  //wsport,      //当前节点提供代理服务的守护端口，采用行命令传入
  //network,    //试图连接的对等网络的类型，采用行命令传入
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
  await node.connect();
  node.startSync();
  
  if(node.miner && (!node.miner.addresses || node.miner.addresses.length==0)) {
    await node.rpc.execute({method:'miner.setsync.admin',params:[]});
    await node.rpc.execute({method:'miner.setaddr.admin',params:[]});
  }

  //#region 建立代理服务, 直接使用 node 设定的通讯参数
  startproxy({
    node: node, 
    pow: process.argv.indexOf('--pow') !== -1,
    ports: [2000, 2100], //允许代理连接的端口号
  });
  //#endregion

  //#region 添加静态映射网站，使用 node 设定的通讯参数，端口固定为 2009
  webstatic('http', node.config.str('wshost'), 2009, [
    {path: '/', dir: './www/wallet'},   //轻钱包，密钥本地存储
    {path: '/spv', dir: './www/spv'},   //SPV钱包，密钥本地存储，默克尔树校验交易
  ]);
  //#endregion

  //#region 添加可信信道

  let hopes = [], $time = 5000;
  //通过参数或环境变量读取only参数
  let only = null;
  if (node.config.args.only) {
     only = node.config.args.only;
  } else if (node.config.env.only) {
    only = node.config.env.only;
  }
  //通过参数或环境变量读取nodes参数
  let nodes = null;
  if (node.config.args.nodes) {
    nodes = node.config.args.nodes;
  } else if (node.config.env.nodes) {
    nodes = node.config.env.nodes;
  }
  if (only) {
    for(let it of only.split(',')) {
      let env = it.split(':');
      if(env.length == 2) {
        hopes.push({conn: it, connect: false, type: node.network.type, ip: env[0], port: parseInt(env[1]) + 2});
      }
    }
  } else if (nodes) {
    for(let it of nodes.split(',')) {
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
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
