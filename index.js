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
const Account = gamegold.wallet.Account;
const MTX = gamegold.mtx;

const node = new FullNode({
  config: true, // 是否载入外部配置文件
  argv: true,
  env: true,
  logFile: true,
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
  mnemonic: {
    passphrase: 'bookmansoft',
    language: 'english',
    bits: 256,
  },
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

  const cdb = node.require('contractdb');
  if (cdb) {
    cdb.on('prop/receive', msg => {
      //console.log('prop/receive:', msg);
    });

    cdb.on('prop/auction', msg => {
      //console.log('prop/auction:', msg);
    });

    cdb.on('cp/orderPay', msg => {
      //console.log('cp/orderPay:', msg);
    });

    cdb.on('balance.client', msg => {
      //console.log('balance.client', msg);
    });
  }

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

    //#region 多签合约下发通告处理句柄
    wdb.on('mssendpubk/receive', async msg => {
      let wallet = await wdb.get(msg.addr);
      if(!wallet) { //尚未创建本地多签钱包: 使用下行参数创建
          wallet = await wdb.ensure({
              id: msg.addr,         //Wallet ID (used for storage)
              type: 'multisig',     //Type of wallet (pubkeyhash, multisig) (default=pubkeyhash).
              m: msg.m,             //`m` value for multisig.
              n: msg.n,             //`n` value for multisig.
              witness: true,        //Whether to use witness programs.
          });

          let [wid, account] = await wdb.getAccountByAddress(msg.addr);
          let wa = await wdb.get(wid);
          if(!!wa) {
            await wa.send({
                subtractFee: false,
                sort: false,
                outputs: [{
                    address: msg.contract,
                    value: 10000,
                }],
                comment: JSON.stringify({
                    oper: 'scrun',//合约驱动
                    params: {
                        oper: 'pubk',
                        addr: msg.addr,
                        puba: wallet.account.accountKey,
                    },
                }), 
            }, account);
          }
      }

      if(wallet.account.keys.length < wallet.account.n-1) {
        //将收到的公钥导入钱包
        let ks = msg.data.split(',');
        for(let k of ks) {
          try {
            await wallet.addSharedKey(k);
          } catch(e) {

          }
        }

        if(wallet.account.keys.length == wallet.account.n-1) { //首次达成公钥集齐，发送[合约驱动:上传地址]
          let [wid, account] = await wdb.getAccountByAddress(msg.addr);
          let wa = await wdb.get(wid);
          if(!!wa) {
            await wa.send({
                subtractFee: false,
                sort: false,
                outputs: [{
                    address: msg.contract,
                    value: 10000,
                }],
                comment: JSON.stringify({
                    oper: 'scrun',//合约驱动
                    params: {
                        oper: 'puba',
                        addr: msg.addr,
                        puba: wallet.account['receive'].getAddress().toString(),
                    },
                }), 
            }, account);
          }
        }
      }
    });

    wdb.on('mssendtx/receive', async msg => {
      //收到[合约衍生：下发签名]，补充签名，如果达到门限要求就广播交易，否则选择发送[合约衍生：上传签名]
      let wallet = await wdb.get(msg.addr);
      if(wallet && wallet.account.type == Account.types.MULTISIG) {
        const mtx = MTX.fromRaw(msg.data, 'hex');
        mtx.view = await wallet.getCoinView(mtx);
        if(!mtx.isSigned()) {
          //暂存待签名交易
          msg.txid = mtx.txid();
          await wdb.saveMSTrans(msg);
        }
      }
    });
    //#endregion
  }

  await node.connect();
  node.startSync();
  
  //通过传入 true/false 开启/关闭挖矿
  node.rpc.execute({method:'miner.set.admin',params:[false]});

  if(node.miner && !node.miner.tokenAddress) {
    await node.rpc.execute({method:'miner.setsync.admin',params:[]});
    await node.rpc.execute({method:'miner.setaddr.admin',params:[]});
  }

  //#region 建立代理服务
  startproxy({
    node: node, 
    pow: process.argv.indexOf('--pow') !== -1,
    ports: [7333, 17333, 17444, 27333, 27901],
  });
  //#endregion
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
