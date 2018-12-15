/**
 * 单元测试：多签钱包业务流程
 * Creted by liub 2018.12.13
 */

let {waiting} = require('../util/comm')

//引入工具包
const toolkit = require('gamegoldtoolkit')

//创建授权式连接器实例
const remote = new toolkit.conn();
//兼容性设置，提供模拟浏览器环境中的 fetch 函数
remote.setFetch(require('node-fetch'))  
//设置连接串
let connConfig = {
  type:   'testnet',
  ip:     '127.0.0.1',          //远程服务器地址
  head:   'http',               //远程服务器通讯协议，分为 http 和 https
  id:     'primary',            //默认访问的钱包编号
  apiKey: 'bookmansoft',        //远程服务器基本校验密码
  cid:    'xxxxxxxx-game-gold-root-xxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
  token:  '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08', //授权节点令牌固定量，用于访问远程钱包时的认证
};
remote.setup(connConfig);

//建立上下文对象
let env = {
  Alice: {id:'abc',key:null,address:null,tx:null},
  Bob: {id:'bac',key:null,address:null,tx:null},
  Carson: {id:'cab',key:null,address:null,tx:null},
  Robin: {id:'Robin',key:null,address:null,tx:null},
};

//创建钱包参数配置
const params = [];
params.push(null);       //Wallet ID (used for storage)
params.push('multisig');          //Type of wallet (pubkeyhash, multisig) (default=pubkeyhash).
params.push(3);                   //`m` value for multisig.
params.push(3);                   //`n` value for multisig.
params.push(null);                //mnemonic phrase to use to instantiate an hd private key for wallet
params.push(null);                //passphrase to encrypt wallet
params.push(null);                //Master HD key. If not present, it will be generated.
params.push(true);                //Whether to use witness programs.
params.push(false);               //set true to create a watch-only wallet
params.push(null);                //public key used for multisig wallet

describe.only('多签钱包', function() {
    /**
     * 创建多签钱包后，需要通过独立渠道，将自身公钥传递给其他合伙人
     */
    it('Alice创建多签钱包，返回相关参数', async () => {
      params[0] = env.Alice.id;
      let msg = await remote.execute('wallet.create', params);
      env.Alice.key = msg.account.accountKey;
      console.log(msg);
    });

    /**
     * 创建多签钱包后，需要通过独立渠道，将自身公钥传递给其他合伙人
     */
    it('Bob创建多签钱包，返回相关参数', async () => {
      params[0] = env.Bob.id;
      let msg = await remote.execute('wallet.create', params);
      env.Bob.key = msg.account.accountKey;
      console.log(msg);
    });

    /**
     * 创建多签钱包后，需要通过独立渠道，将自身公钥传递给其他合伙人
     */
    it('Carson创建多签钱包，返回相关参数', async () => {
      params[0] = env.Carson.id;
      let msg = await remote.execute('wallet.create', params);
      env.Carson.key = msg.account.accountKey;
      console.log(msg);
    });

    /**
     * 添加合伙人公钥后，可以在 wallet.account.keys 的元素数量上看到变化， 和 wallet.account.n 比对即可得知钱包是否已经激活
     */
    it('Alice导入他人公钥，激活多签钱包', async () => {
      await waiting(2000);
      
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Alice.id});
      //从远端查询目标钱包详情
      let msg = await remote.execute('wallet.select', [env.Alice.id]);
      console.log('active:', `${msg.account.keys.length}/${msg.account.n-1}`);

      await remote.execute('key.shared.add', [null, env.Bob.key]);

      msg = await remote.execute('wallet.select', [env.Alice.id]);
      console.log('active:', `${msg.account.keys.length}/${msg.account.n-1}`);

      await remote.execute('key.shared.add', [null, env.Carson.key]);

      msg = await remote.execute('wallet.select', [env.Alice.id]);
      console.log('active:', `${msg.account.keys.length}/${msg.account.n-1}`);

      //注意：只有钱包被激活后，才能取到多签地址
      env.Alice.address = msg.account.receiveAddress;
    });

    it('Bob导入他人公钥，激活多签钱包', async () => {
      await waiting(2000);
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Bob.id});
      await remote.execute('key.shared.add', [null, env.Alice.key]);
      await remote.execute('key.shared.add', [null, env.Carson.key]);
    });

    it('Carson导入他人公钥，激活多签钱包', async () => {
      await waiting(2000);
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Carson.id});
      await remote.execute('key.shared.add', [null, env.Alice.key]);
      await remote.execute('key.shared.add', [null, env.Bob.key]);
    });

    it('Robin创建普通钱包，返回相关参数', async () => {
      params[0] = env.Robin.id;
      params[1] = 'pubkeyhash';
      params[2] = 1;
      params[3] = 1;
      let msg = await remote.execute('wallet.create', params);
      env.Robin.key = msg.account.accountKey;
      env.Robin.address = msg.account.receiveAddress;
      console.log(msg);
    });

    /**
     * Alice向第三方展示或直接传递多签钱包中的任意地址
     */
    it('第三方向Alice多签钱包转账', async () => {
      await waiting(2000);
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: 'primary'});
      let msg = await remote.execute('tx.send', [env.Alice.address, 500000]);
      console.log(msg);
    });

    /**
     * Robin向Alice展示或直接传递普通钱包中的任意地址，然后Alice就可以向Robin转账，与此同时Bob将收到交易通知
     * 那么Bob如何收到转账交易？鉴于该笔交易未完成签名，所以也无法通过P2P网络中继，目前的做法是，Alice需要通过独立渠道，将交易对原始数据展示或直接传递给Bob
     */
    it('Alice从多签钱包向Robin转账, Bob收到转账交易，决定批准该交易', async () => {
      await waiting(3000);
      //Alice动用多签钱包向Robin转账
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Alice.id});
      let msg = await remote.execute('tx.create', [ { rate: 10000, sendnow: false, }, [{ value: 10000, address: env.Robin.address,}], ]);
      console.log('multi sig:', msg.ms);

      await waiting(1000);
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Bob.id});
      msg = await remote.execute('tx.sign', [msg.hex, true]); //签署并广播交易
      console.log('multi sig:', msg.ms);

      await waiting(1000);
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Carson.id});
      msg = await remote.execute('tx.sign', [msg.hex, true]); //签署并广播交易
      console.log('multi sig:', msg.ms);
    });

    it('Robin查询并确认收到转账资金', async () => {
      await waiting(2000);
      //切换连接器的目标钱包编号
      remote.setup({type: 'testnet', id: env.Robin.id});
      let msg = await remote.execute('balance.all', []);
      console.log(msg);
    });
});
