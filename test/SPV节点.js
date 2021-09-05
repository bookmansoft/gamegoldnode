/**
 * 联机单元测试: SPV节点
 * @description 验证SPV节点的交易收发功能
 * 1. Bob启动SPV节点，管理自己的个人资产，与此同时Alice通过全节点管理自己的个人资产
 * 2. Alice向Bob转账，Bob查询发现实时收到了款项
 * 3. Bob向Alice转账，Bob查询发现实时扣取了款项
 * 4. 全节点执行记账操作，Bob查询发现交易得到了确认
 */

const assert = require('assert');
const connector = require('../test/online/connector')

//连接Alice的全节点
const remoteA = connector({
  type:   'testnet',
  structured: true,
});

//连接Bob的SPV节点
const remoteB = connector({
  type:   'testnet',
  port:   2101,                 //RPC端口
  structured: true,
});

const exec = require('child_process').exec; 
let net_wallet = null;

//环境缓存对象
let env = {
	alice: {},
  bob: {},
  amount: 100000000,
};

describe('SPV节点 - 交易收发', () => {
  after(()=>{
    remoteB.close();
    remoteA.close();

    //退出节点运行
    if(net_wallet) {
      net_wallet.kill('SIGTERM');
    }
  });

  before(async ()=>{
    //Bob启动SPV节点，与此同时Alice通过全节点钱包，分别管理自己的个人资产
    net_wallet = exec(`npm run spv`, function(err, stdout, stderr) {
      if(err) {
          console.log(stderr);
      } else {
          //console.log(JSON.parse(stdout));
      }
    });

    await remoteA.wait(7000);
    await remoteA.execute('miner.setsync.admin', [true]);
    let ret = await remoteA.execute('block.tips', []);
    if(ret.result[0].height < 100) {
      await remoteA.execute('miner.generate.admin', [100 - ret.result[0].height]);
    } else {
      await remoteA.wait(5000);
    }
  });

  it(`Alice和Bob分别创建专属地址`, async () => {
    //Alice创建地址
    let ret = await remoteA.execute('address.create', []);
    assert(ret.code == 0);
    env.alice.address = ret.result.address;

    //Bob创建地址
    ret = await remoteB.execute('address.create', []);
    assert(ret.code == 0);
    env.bob.address = ret.result.address;

    //Bob查询余额
    ret = await remoteB.execute('balance.all', []);
    assert(ret.code == 0);
    env.bob.unconfirmed = ret.result.unconfirmed;
    env.bob.confirmed = ret.result.confirmed;
  });

	it(`Alice向Bob转账，Bob查询发现实时收到了款项`, async () => {
    let ret = await remoteA.execute('tx.send', [env.bob.address, env.amount]);
    assert(ret.code == 0);
    await remoteB.wait(3000);

    ret = await remoteA.execute('address.amount', [env.bob.address]);
    assert(ret.result * 100000000 == env.amount);

    await remoteB.wait(3000);

    ret = await remoteB.execute('balance.all', []);
    assert(ret.code == 0);
    assert(ret.result.unconfirmed == env.bob.unconfirmed + env.amount);
    env.bob.unconfirmed = ret.result.unconfirmed;
  });

	it(`Bob向Alice转账，Bob查询发现实时扣取了款项`, async () => {
    let ret = await remoteB.execute('tx.send', [env.alice.address, env.amount/2]);
    assert(ret.code == 0);

    await remoteB.wait(5000);
    ret = await remoteB.execute('balance.all', []);
    assert(ret.code == 0);
    assert(ret.result.unconfirmed <= env.bob.unconfirmed - env.amount/2); //除了转账金额，可能还扣除了一定的手续费
    env.bob.unconfirmed = ret.result.unconfirmed;
  });

  it('全节点执行记账操作，Bob查询发现交易得到了确认', async () => {
      await remoteA.execute('miner.generate.admin', [3]);
      await remoteA.wait(3000);

      let ret = await remoteB.execute('balance.all', []);
      assert(ret.code == 0);
      assert(ret.result.unconfirmed == ret.result.confirmed);
  });
});