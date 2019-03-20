#!/usr/bin/env node

'use strict';


process.title = 'gamegold-spv';

const gamegold = require('gamegold');
const SPVNode = gamegold.spvnode;

// 创建节点，传入options配置对象。注意该配置对象的优先级低于 gamegold.conf
const node = new SPVNode({
  config: true,
  argv: true,
  env: true,
  logFile: true,
  logConsole: true,
  logLevel: 'debug',
  db: 'leveldb',
  persistent: true,
  workers: true,
  listen: true,
  loader: require,
  plugins: [ //2018.5.3 当前版本要求：钱包插件最后载入
    gamegold.wallet.plugin,    //钱包管理插件，可以在全节点或SPV节点加载
  ],
});

// 新增：插件打开时，抛出事件通知数据库打开模式
node.on('plugin open', (ret) => {
  switch (ret.type) {
    case 'chaindb':
      if (ret.result == 'new') {
        // 链库是新建的
        console.log('chaindb new');
      } else {
        // 链库是已有的
        console.log('chaindb exist');
      }
      break;
  }
});

process.on('unhandledRejection', (err, promise) => {
  console.error(err);
});

// Uncaught exception handler
process.on('uncaughtException', (err) => {
  console.error(` Caught exceptio n: ${err.stack}`);
});

// 构造一个异步函数的壳，运行并捕获错误事件
(async () => {
  await node.ensure();

  // 测试钱包数据库是否已经建立
  const wdb = node.require('walletdb');
  if (wdb) {
    if (await wdb.isNewRecord()) {
      // 当前尚未建立钱包数据库，引导用户进入创建钱包流程，补充输入必要的前导信息，例如 passphrase
      console.log('new wallet db.');

      const sel = 3;
      switch (sel) {
        case 1: {
          // 选择1：引导用户导入助记符
          const phrase = '紧 成 剪 性 域 伐 济 等 阿 宪 圈 球';
          const rt = wdb.testmnemonic(phrase);
          if (rt.code == 0) {
            wdb.setmnemonicByWords(phrase);
          } else {
            // 提示助记符错误
            // @note：为了维护良好的用户体验，需要提示具体的错误原因，例如长度不足等等
            console.log(rt.msg);
            process.exit(1);
          }
          break;
        }
        case 2: {
          // 选择2：系统自动生成随机的熵字节序列，并引导用户离线记录对应的助记符
          wdb.setmnemonicByEntropy('11111111111111111111111111111111');
          // @note 此处为了方便测试，使用了固定的熵字节序列
          break;
        }
        case 3:
        {
          // 选择3：指定熵的长度（位），内部自动生成助记符，然后引导用户离线记录对应的助记符
          wdb.setmnemonicByLen(128);
          break;
        }
      }

      // 钱包的语言版本，注意该设定只是决定了 primary 的语言版本，后续创建的钱包还得单独设定
      wdb.setlanguage('simplified chinese');

      // 衍生键用的盐, 实际运行时由用户实时输入，而非采用配置表传入
      wdb.setpassphrase('bookmansoft');
    } else {
      // 当前已经建立了钱包数据库，可以做一些进一步的判断，例如钱包是否已备份等
      console.log('wallet db exists.');

      //! 仅模拟测试：删除现有数据库
      // await wdb.rpc.execute({method:'destroywalletdb', params:[]});
    }

    //订阅钱包事件: 用于SPV钱包应用中
    //@note 中心钱包则使用连接器订阅消息
    wdb.on('prop/receive', msg => {
      console.log('prop/receive:', msg);
    });

    wdb.on('balance.account.client', msg => {
      console.log('balance.account.client', msg);
    });

    wdb.on('balance.client', msg => {
      console.log('balance.client', msg);
    });
  } else {
    // 当前节点不具备钱包插件
    console.log('wallet plugin not find.');
  }

  await node.open();
  await node.connect();

  node.startSync();
})().catch((err) => {
  console.error(err.stack);
  process.exit(1);
});
