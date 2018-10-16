#!/usr/bin/env node

'use strict';

process.title = 'gamegold';

const gamegold = require('gamegold');

var util = gamegold.util;
var logger = new gamegold.logger({ level: 'debug', console: true });
logger.writeConsole = function(level, module, args) {
  var name = gamegold.logger.levelsByVal[level];
  var msg = util.format(args, false);
  console.log(name, module, msg);
};

function addItem(item, entry) {
  console.log(item, entry);
}

var node = new gamegold.fullnode({
  hash: true,
  query: true,
  prune: false,
  network: 'testnet',
  db: 'leveldb',
  coinCache: 30000000,
  logConsole: true,
  workers: true,
  logger: logger,
  persistent: true,
  logLevel: 'debug',
  logFile: true,
  loader: require,
  config: true, //是否载入外部配置文件
  argv: true,
  env: true,
  listen: true,
  plugins: [ //2018.5.3 当前版本要求：钱包插件最后载入
    gamegold.wallet.plugin,    //钱包管理插件，可以在全节点或SPV节点加载
  ],
});

process.on('unhandledRejection', (err, promise) => {
  console.error(err);
  //throw err;
});

node.chain.on('block', addItem);
node.mempool.on('tx', addItem);

(async ()=>{
  /**
   * 当前结点是一个全功能节点，提供如下功能：
   * 1、一个通常意义上的全节点服务器
   * 2、提供基于WS的代理服务，负责 websocket 到 tcpsocket 的桥接
   */

  //region 启动全节点程序
  await node.ensure();

  //测试钱包数据库是否已经建立
  let wdb = node.require('walletdb');
  if(!!wdb) {
    if(await wdb.isNewRecord()) {
      //当前尚未建立钱包数据库，引导用户进入创建钱包流程，补充输入必要的前导信息，例如 passphrase
      console.log('new wallet db.');

      let sel = 1;
      switch(sel) {
        case 1: {
          //选择1：引导用户导入助记符
          let phrase = '紧 成 剪 性 域 伐 济 等 阿 宪 圈 球';
          let rt = wdb.testmnemonic(phrase); // rt的结构 {code: Number, msg: String}
          if(rt.code == 0) {
            wdb.setmnemonicByWords(phrase);
          }
          else {
            //提示助记符错误
            //@note：为了维护良好的用户体验，需要提示具体的错误原因，例如长度不足等等
            throw rt.msg;
          }
          break;
        }
        case 2: {
          //选择2：外部生成随机的熵字节序列，导入钱包，然后引导用户离线记录对应的助记符
          wdb.setmnemonicByEntropy('11111111111111111111111111111111');
          //@note 此处为了方便测试，使用了固定的熵字节序列
          break;
        }
        case 3:
        {
          //选择3：指定熵的长度（位），内部自动生成助记符，然后引导用户离线记录对应的助记符
          wdb.setmnemonicByLen(128);
          break;
        }
      }

      //钱包的语言版本，注意该设定只是决定了 primary 的语言版本，后续创建的钱包还得单独设定
      wdb.setlanguage('simplified chinese');

      //衍生键用的盐, 实际运行时由用户实时输入，而非采用配置表传入
      wdb.setpassphrase('bookmansoft');
    }
    else {
      //当前已经建立了钱包数据库，可以做一些进一步的判断，例如钱包是否已备份等
    }
  }
  else {
    //当前节点不具备钱包插件
  }

  await node.open();
  await node.connect();
  node.startSync();

  //开启挖矿
  await node.rpc.execute({method:'miner.set',params:[true]});
  // endregion

  //#region 建立代理服务
  gamegold.startproxy({
    node: node, 
    pow: process.argv.indexOf('--pow') !== -1,
    ports: [7333, 17333, 17444, 27333, 27901],
  });
  //#endregion
})().catch(err =>{
  console.error(err.stack);
  process.exit(1);
});
