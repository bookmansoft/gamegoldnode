/**
 * 单元测试：多签钱包业务流程
 * Creted by liub 2018.12.13
 */

const remote = (require('../lib/remote/connector'))();
const assert = require('assert');

//建立上下文对象
let env = {
  Alice:  {id:'ft1',key:null,address:null,tx:null},
  Bob:    {id:'ft2',key:null,address:null,tx:null},
  Robin:  {id:'ft4',key:null,address:null,tx:null},
};

describe.skip('多签钱包', function() {
    it('Robin创建普通钱包，返回相关参数', async () => {
      let msg = await remote.execute('wallet.create', [null, 'pubkeyhash', 1, 1]);
      env.Robin.id = msg.id;
      env.Robin.key = msg.account.accountKey;
      env.Robin.address = msg.account.receiveAddress;

      msg = await remote.execute('balance.all', [env.Robin.id]);
      env.Robin.confirmed = msg.confirmed;
    });

    /**
     * Alice和Bob创建多签钱包
     */
    it('Alice创建多签钱包，返回相关参数', async () => {
      let msg = await remote.execute('wallet.create', [
        null,
        'multisig',         //Type of wallet (pubkeyhash, multisig) (default=pubkeyhash).
        2,                  //`m` value for multisig.
        2,                  //`n` value for multisig.
        null,               //mnemonic phrase to use to instantiate an hd private key for wallet
        null,               //passphrase to encrypt wallet
        null,               //Master HD key. If not present, it will be generated.
        true,               //Whether to use witness programs.
        false,              //set true to create a watch-only wallet
        null,               //public key used for multisig wallet
      ]);
      env.Alice.id = msg.id;
      env.Alice.key = msg.account.accountKey;

      msg = await remote.execute('wallet.create', [
        null,
        'multisig',         //Type of wallet (pubkeyhash, multisig) (default=pubkeyhash).
        2,                  //`m` value for multisig.
        2,                  //`n` value for multisig.
        null,               //mnemonic phrase to use to instantiate an hd private key for wallet
        null,               //passphrase to encrypt wallet
        null,               //Master HD key. If not present, it will be generated.
        true,               //Whether to use witness programs.
        false,              //set true to create a watch-only wallet
        null,               //public key used for multisig wallet
      ]);
      env.Bob.id = msg.id;
      env.Bob.key = msg.account.accountKey;
    });

    /**
     * 通过独立渠道，将自身公钥传递给其他合伙人，以便添加到多签钱包中
     * 可以在 wallet.account.keys 的元素数量上看到变化， 和 wallet.account.n 比对即可得知钱包是否已经激活
     */
    it('Alice导入他人公钥，激活多签钱包', async () => {
      remote.setup({type: 'testnet', id: env.Alice.id});
      await remote.execute('key.shared.add', [null, env.Bob.key]);
      const msg = await remote.execute('wallet.info', [env.Alice.id]);
      env.Alice.address = msg.account.receiveAddress;
    });

    it('Bob导入他人公钥，激活多签钱包', async () => {
      remote.setup({type: 'testnet', id: env.Bob.id});
      await remote.execute('key.shared.add', [null, env.Alice.key]);
      const msg = await remote.execute('wallet.info', [env.Bob.id]);
      env.Bob.address = msg.account.receiveAddress;

      assert(env.Alice.address, env.Bob.address);
    });

    /**
     * Alice向第三方展示或直接传递多签钱包中的任意地址
     */
    it('第三方向Alice多签钱包转账', async () => {
      remote.setup({type: 'testnet', id: 'primary'});
      let msg = await remote.execute('tx.send', [env.Alice.address, 500000]);
    });

    /**
     * Robin向Alice展示或直接传递普通钱包中的任意地址，然后Alice就可以向Robin转账
     * 那么Bob如何收到转账交易？鉴于该笔交易未完成签名，所以也无法通过P2P网络中继
     * 目前的做法是，Alice需要通过独立渠道，将交易对原始数据展示或直接传递给Bob
     */

    it('Alice从多签钱包向Robin转账, Bob收到转账交易，决定批准该交易', async () => {
      //Alice动用多签钱包向Robin转账
      remote.setup({type: 'testnet', id: env.Alice.id});//切换连接器的目标钱包编号
      let msg = await remote.execute('tx.create', [ { rate: 10000, sendnow: false, }, [{ value: 10000, address: env.Robin.address,}], ]);

      await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);

      //Bob签署交易
      remote.setup({type: 'testnet', id: env.Bob.id});//切换连接器的目标钱包编号
      msg = await remote.execute('tx.sign.admin', [msg.hex, true]); //签署交易
    });

    it('Robin查询并确认收到转账资金', async () => {
      await remote.execute('miner.generate.admin', [1]);
      await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);

      let msg = await remote.execute('balance.all', [env.Robin.id]);
      assert(env.Robin.confirmed + 10000, msg.confirmed);
    });
});
