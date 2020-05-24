#!/usr/bin/env node

'use strict';
process.title = 'gamegold';

const gamegold = require('gamegold');
const startproxy = require('./lib/proxy/startproxy');
const FullNode = gamegold.fullnode;
const MnemonicHelper = gamegold.hd.MnemonicHelper;
const consensus = gamegold.consensus;
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
  plugins: [ 
    gamegold.stratum,           //矿场管理插件，只能在全节点加载
    gamegold.contractPlugin,    //合约账户管理插件，可以在全节点加载
    gamegold.wallet.plugin,     //钱包管理插件，可以在全节点或SPV节点加载
  ],
});

process.on('unhandledRejection', (err, promise) => {
  console.error(err);
});

(async () => {
  /**
   * 当前结点是一个全功能节点，提供如下功能：
   * 1、一个通常意义上的全节点服务器
   * 2、提供基于WS的代理服务，负责 websocket 到 tcpsocket 的桥接
   */

  //#region 启动全节点程序

  await node.ensure();

  //本地钱包创建参数
  let mcfg = {};

  let needSaveWallet = false;
  //测试钱包数据库是否已经建立
  const wdb = node.require('walletdb');
  if (wdb) {
    if (await wdb.isNewRecord()) {
      // 当前尚未建立钱包数据库，引导用户进入创建钱包流程，补充输入必要的前导信息，例如 passphrase
      console.log('new wallet db to be created.');

      let wparams = node.config.args['wallet'].split(',');
      mcfg.passphrase = wparams[0] || 'bookmansoft',
      mcfg.language = wparams[1] || 'english';
      mcfg.bits = parseInt(wparams[2]) || 256;

      let opts = await MnemonicHelper.readFromFile({
        file: `./wallet-${node.config.network}.encrypt`,
        passphrase: mcfg.passphrase,
        bits: mcfg.bits,
        network: node.config.network,
      });

      if(!!opts.phrase) {
        const rt = wdb.testmnemonic(opts.phrase); // rt的结构 {code: Number, msg: String}
        if (rt.code == 0) {
          wdb.setmnemonicByWords(opts.phrase);
          // 钱包的语言版本，注意该设定只是决定了 primary 的语言版本，后续创建的钱包还得单独设定
          wdb.setlanguage(opts.language);

          // 衍生盐 & 加解密密码
          wdb.setpassphrase(mcfg.passphrase);
        } else {
          // 提示助记符错误
          // @note：为了维护良好的用户体验，需要提示具体的错误原因，例如长度不足等等
          throw rt.msg;
        }
      } else {
          // 指定熵的长度（位），内部自动生成助记符
          wdb.setmnemonic(mcfg);
          needSaveWallet = true;
      }
    } else {
      // 当前已经建立了钱包数据库，可以做一些进一步的判断，例如钱包是否已备份等
      console.log('wallet db exists.');
    }

    wdb.on('prop/receive', msg => {
      //console.log('prop/receive:', msg);
    });

    wdb.on('prop/auction', msg => {
      //console.log('prop/auction:', msg);
    });

    wdb.on('cp/orderPay', msg => {
      //console.log('cp/orderPay:', msg);
    });

    wdb.on('balance.account.client', msg => {
      //console.log('balance.account.client', msg);
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
  } else {
    // 当前节点不具备钱包插件
  }

  // 测试合约数据库是否已经建立
  const cdb = node.require('contractdb');
  if (cdb) {
    if (await cdb.isNewRecord()) {
      console.log('new contract db to be created.');

      cdb.setmnemonicByWords(consensus.SmartContractMnemonic.phrase);
      cdb.setlanguage(consensus.SmartContractMnemonic.language);
      cdb.setpassphrase(consensus.SmartContractMnemonic.passphrase);
    } else {
      console.log('contract db exists.');
    }

    cdb.on('prop/receive', msg => {
      //console.log('prop/receive:', msg);
    });

    cdb.on('prop/auction', msg => {
      //console.log('prop/auction:', msg);
    });

    cdb.on('cp/orderPay', msg => {
      //console.log('cp/orderPay:', msg);
    });

    cdb.on('balance.account.client', msg => {
      //console.log('balance.account.client', msg);
    });

    cdb.on('balance.client', msg => {
      //console.log('balance.client', msg);
    });
  } else {
    // 当前节点不具备钱包插件
  }

  // 引擎启动时，如果【链库未创建或已删除】，则进行如下判断：
  // 1. 如果默认启动，则使用默认参数创建统一的创世区块，该节点将和所有默认启动的节点共享默认块链。
  // 2. 如果指定了 --genesis 参数，则认为是新的创世流程，将构造创世参数以创建新的创世区块。该节点将创建一条新的块链
  let opts = null;
  if (!!node.config.args['genesis']) {
    let params = node.config.args['genesis'].split(',');
    //检测是否存在创世文件，如存在则利用它重构创世参数
    opts = await MnemonicHelper.readFromFile({
      //待创建的创世密钥加密文件的名称
      file: `./genesis-${node.config.network}.encrypt`,
      //创世密钥加密密钥兼盐
      passphrase: params[0] || 'bookmansoft',
      // 助记词语言选择 "simplified chinese", "traditional chinese", english, french, italian, japanese, spanish'
      language: params[1] || 'english',
      //创世密钥长度
      bits: parseInt(params[1]) || 256,
      network: node.config.network,
    });
  }

  await node.open(opts);
  await node.connect();

  //对新的钱包库，加密保存其根密钥
  if(needSaveWallet) {
    let prim = await wdb.get('primary');
    let $key = prim.master.toJSON(true);
    await MnemonicHelper.writeToFile({
      body: {
        phrase: $key.mnemonic.phrase,
        language: $key.mnemonic.language,
      },
      passphrase: mcfg.passphrase,
      file: `wallet-${node.config.network}.encrypt`,
      network: node.config.network,
    });
  }

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
