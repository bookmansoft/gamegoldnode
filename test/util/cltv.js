/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1');

//引入工具包
const assert = require('assert');
const toolkit = require('gamerpc');
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'xxxxxxxx-game-gold-root-xxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
    token:  '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08', //授权节点令牌固定量，用于访问远程钱包时的认证
    structured: true,
});

//CP
let cp = {
    name: 'cltv-cp-'+ uuid().slice(0,28),
    id: '',
};

//alice
let alice = {
    name: 'cltv-alice-'+ uuid().slice(0,25),
    addr: '',
};

//bob
let bob = {
    name: 'cltv-bob-'+ uuid().slice(0,27),
    addr: '',
};

//carl
let carl = {
  name: 'cltv-carl-'+ uuid().slice(0,26),
  addr: '',
};

//dave
let dave = {
  name: 'cltv-dave-'+ uuid().slice(0,26),
  addr: '',
};

let curHeight = 0;

describe.skip('锁仓交易', () => {
    it('准备工作', async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', []);

        //检测块高度，必要时进行挖矿以确保创世区块成熟
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            for(let i = ret.result[0].height; i < 101; i++) {
                await remote.execute('miner.generate.admin', [1]);
                await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1500);
            }

            ret = await remote.execute('block.tips', []);
        }

        //记录当前高度
        curHeight = ret.result[0].height;
    });

    it('为Alice,Bob和carl分配账号地址', async () => {
        //注册一个新的CP
        let ret = await remote.execute('cp.create', [cp.name, 'http://127.0.0.1']);

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);

        //查询并打印CP信息
        ret = await remote.execute('cp.byName', [cp.name]);
        cp.id = ret.result.cid;

        //在该CP下注册用户子帐号, 记录其专属地址
        ret = await remote.execute('token.user', [cp.id, alice.name, null, alice.name]);
        alice.cid = cp.id;
        alice.addr = ret.result.data.addr;

        ret = await remote.execute('token.user', [cp.id, bob.name, null, bob.name]);
        bob.cid = cp.id;
        bob.addr = ret.result.data.addr;

        ret = await remote.execute('token.user', [cp.id, carl.name, null, carl.name]);
        carl.cid = cp.id;
        carl.addr = ret.result.data.addr;

        ret = await remote.execute('token.user', [cp.id, dave.name, null, dave.name]);
        dave.cid = cp.id;
        dave.addr = ret.result.data.addr;

        //为Alice转账
        await remote.execute('tx.send', [alice.addr, 500000000]);
    });

    /**
     * 1- 测试绝对高度锁仓
     */
    it('Alice锁仓转账给Bob', async () => {
        //Alice锁仓转账给Bob，指定生效高度为当前高度+2
        await remote.execute('tx.send', [bob.addr, 20000, alice.name, 'clb', curHeight + 2]);
    });

    it('Alice锁仓转账给Bob后,马上查询bob锁仓余额', async () => {      
      let ret = await remote.execute('balance.all', [bob.name]);
      assert(!ret.error);   
      assert(ret.result.locked === 20000);
    });

    it('Bob转账给Alice，操作因为锁仓失败', async () => {
        //Bob账户名下只有一笔Alice锁仓转账的UTXO，在当前高度下是无法使用的，因此会归于失败
        let ret = await remote.execute('tx.send', [alice.addr, 10000, bob.name]);
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('在块高度提升后，Bob转账给Alice，操作成功', async () => {
        //提升3个块高度
        await remote.execute('miner.generate.admin', [3]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(5000);

        //Bob从自己的账户向Alice再次转账，此时由于条件成熟，操作应该成功
        let ret = await remote.execute('tx.send', [alice.addr, 10000, bob.name]);        
        assert(!ret.error);
        console.log(ret.result);
    });

    it('查询bob锁仓余额', async () => {      
      let ret = await remote.execute('balance.all', [bob.name]);
      assert(!ret.error);
      assert(ret.result.locked === 0);
    });

    /**
     * 2- 测试相对高度锁仓
     */
    it('Alice锁仓转账给Carl', async () => {
      //Alice锁仓转账给Carl，指定锁仓相对高度为2
      await remote.execute('tx.send', [carl.addr, 20000, alice.name, 'csb', 2]);
    });

    it('Carl转账给Alice，操作因为锁仓失败', async () => {
      //Carl账户名下只有一笔Alice锁仓转账的UTXO，在当前高度下是无法使用的，因此会归于失败
      let ret = await remote.execute('tx.send', [alice.addr, 10000, carl.name]);
      assert(!!ret.error);
      console.log(ret.error);
    });

    it('在块高度提升后，Carl转账给Alice，操作成功', async () => {
      //提升3个块高度
      await remote.execute('miner.generate.admin', [3]);
      await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(5000);

      //Carl从自己的账户向Alice再次转账，此时由于条件成熟，操作应该成功
      let ret = await remote.execute('tx.send', [alice.addr, 10000, carl.name]);
      assert(!ret.error);
      console.log(ret.result);
    });

    /**
     * 3- 测试绝对时间锁仓
     */
    it('Alice锁仓转账给Dave', async () => {
      //Alice锁仓转账给Dave，指定锁仓绝对时间为现在之后10秒
      let locktime = Math.floor(Date.now() / 1000) + 10;
      await remote.execute('tx.send', [dave.addr, 20000, alice.name, 'clt', locktime]);
    });

    it('Dave转账给Alice，操作因为锁仓失败', async () => {
      //Dave账户名下只有一笔Alice锁仓转账的UTXO，在当前高度/时间下是无法使用的，因此会归于失败
      let ret = await remote.execute('tx.send', [alice.addr, 10000, dave.name]);
      assert(!!ret.error);
      console.log(ret.error);
    });

    it('在块高度提升后和时间要求满足后，Dave转账给Alice，操作成功', async () => {
      //提升1个块高度
      await remote.execute('miner.generate.admin', [1]);
      //等待锁仓10秒
      await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(10000);
      // 由于取得是中位时间(前11个块),需要连挖10个块,保证Dave的UTXO可用
      for(let i = 0; i < 6; i++) {
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
      }
      //Dave从自己的账户向Alice再次转账，此时由于条件成熟，操作应该成功
      let ret = await remote.execute('tx.send', [alice.addr, 10000, dave.name]);
      assert(!ret.error);
      console.log(ret.result);
      //确保交易上链
      await remote.execute('miner.generate.admin', [1]);     
      await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
    });
});
