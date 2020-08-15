/**
 * 联机单元测试: 跨链机制 - GIP0028
 * @description 应用场景描述
 * 1. Alice向Bob的A链地址发起HTLC请求，使用她的B链地址锁定交易
 * 2. Bob在A链上收到该HTLC请求，他在B链上向Alice的B链地址发起HTLC应答，仍旧使用Alice的B链地址锁定交易
 * 3. Alice在B链上收到HTLC应答，立即在B链发起Deal交易进行提款，此时需要提交她的B链地址的公钥
 * 4. Bob在B链收到Alice.Deal交易通知，获取并利用Alice的B链地址的公钥，在A链上发起Deal交易
 * 5. Alice在A链上收到Bob.Deal交易通知，至此完成了整个业务流程
 */

const assert = require('assert');
const uuidv1 = require('uuid/v1');
const common = require('../test/util/common');
const connector = require('../test/util/connector')

//引入核心库，在包引入模式下直接使用 require('gamegold')
const gamegold = require('gamegold');
const consensus = gamegold.consensus;

//连接A链
const remoteA = connector({
  type:   'testnet',
  structured: true,
});

//连接B链
const remoteB = connector({
  type:   'main',
  structured: true,
});

const exec = require('child_process').exec; 
let net_main = null;

//环境缓存对象
let env = {
	alice: {},
  bob: {},
  transaction: 3, //测试业务笔数
};

describe('跨链机制 - GIP0028', () => {
  after(()=>{
    //退出节点运行
    net_main.kill('SIGTERM');
  });

  before(async ()=>{
    net_main = exec(`node index.js --genesis --network=main`, function(err, stdout, stderr) {
      if(err) {
          console.log(stderr);
      } else {
          // var data = JSON.parse(stdout);
          // console.log(data);
      }
    });
    net_main.on('exit', () => {
      //console.log('node exit.');
    });

    await remoteA.wait(5000);

    //为Alice/Bob创建账号名
    env.alice.name = uuidv1();
		env.bob.name = uuidv1();

    let ret = await remoteA.execute('block.tips', []);
    if(ret.result[0].height < 100) {
      await remoteA.execute('miner.generate.admin', [100 - ret.result[0].height]);
    }

    ret = await remoteB.execute('block.tips', []);
    if(ret.result[0].height < 100) {
      await remoteB.execute('miner.generate.admin', [100 - ret.result[0].height]);
    }

    //设为长连模式，监听A链事件
    remoteA.setmode(remoteA.CommMode.ws, async () => { });
		remoteA.watch(async msg => {
      //收到HTLC请求交易通知
			if(msg.account == env.bob.name) { //Bob收到了消息
        if(env.select > 0.33) { //一定概率下，Bob在B链发起HTLC应答交易
          let ret = await remoteB.execute('htlc.assent', [{
            src: msg.src,
            hash: msg.shash, 
            index: msg.sidx, 
            dst: msg.dst,
            amount: msg.amount, 
            rate: msg.rate, 
            alice: msg.aliceB
          }, env.bob.name]);
          assert(ret.code == 0);
          
					await remoteB.execute('miner.generate.admin', [1]);
          console.log('响应跨链合约(htlc.assent)');
				}
			} else { //Alice收到了消息
				if(env.select <= 0.33) { //一定概率下，Alice在A链发起HTLC请求取消交易
          await remoteA.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD*2]);//满足时延要求
					let ret = await remoteA.execute('htlc.suggest.cancel', [{
            txid: common.revHex(msg.shash), 
            index: msg.sidx, 
            sa: env.alice.sa, 
            master: msg.alice, //使用Alice的A链地址发起取消交易
          }, env.bob.name]);
          assert(ret.code == 0);

          //数据上链
					ret = await remoteA.execute('miner.generate.admin', [1]);
          assert(ret.code == 0);
					console.log('取消合约(htlc.suggest.cancel)');
				}
			}
		}, 'htlcsuggest.receive').watch(async msg => {
      //收到HTLC请求提款交易
      if(msg.account == env.alice.name) { //Alice收到了消息
        //合约执行完毕，验证合约状态
        assert(msg.pst, 4);
        console.log('合约履行完毕(contract finished)');
			}
		}, 'htlcsuggest.deal');

    //设定长连模式，监听B链事件
		remoteB.setmode(remoteA.CommMode.ws, async () => { });
		remoteB.watch(async msg => {
      //收到HTLC应答交易通知
			if(msg.account == env.alice.name) { //Alice收到了消息
				if(env.select > 0.66) { //一定概率下，Alice在B链发起提款交易
					let ret = await remoteB.execute('htlc.assent.deal', [{
            txid: common.revHex(msg.ahash), 
            index: msg.aidx, 
            sa: env.alice.sa
          }, env.alice.name]);
          assert(ret.code == 0);
          
					await remoteB.execute('miner.generate.admin', [1]);
					console.log('兑现响应(htlc.assent.deal)');
				}
			} else { //Bob收到了消息
				if(env.select <= 0.66) { //一定概率下，Bob在B链发起了应答取消交易
					await remoteB.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD]);//满足时延要求
					let ret = await remoteB.execute('htlc.assent.cancel', [{
            txid: common.revHex(msg.ahash), 
            index: msg.aidx, 
            master: msg.bob, //使用Bob的B链地址发起取消交易
          }, env.bob.name]);
          assert(ret.code == 0);
          
					ret = await remoteB.execute('miner.generate.admin', [1]);
					assert(ret.code == 0);
					console.log('取消响应(htlc.assent.cancel)');
				}
			}
		}, 'htlcassent.receive').watch(async msg => {
      //收到HTLC应答提款交易
      if(msg.account == env.bob.name) { //Bob收到了消息
        //Bob在A链发起提款交易
				let ret = await remoteA.execute('htlc.suggest.deal', [{
          txid: common.revHex(msg.shash), 
          index: msg.sidx, 
          sa: msg.secret,
        }, env.bob.name]);
        assert(ret.code == 0);
        console.log('兑现合约(htlc.suggest.deal)');
        
				ret = await remoteA.execute('miner.generate.admin', [1]);
				assert(ret.code == 0);
      }
		}, 'htlcassent.deal');
  });

	it(`发起跨链交易：连续发起${env.transaction}笔跨链交易，并随机不同交易流程如成交/取消`, async () => {
    for(let i = 0; i < env.transaction; i++) { 
      //在A链上为Alice和Bob充值
      await remoteA.execute('tx.create', [{"sendnow":true}, [{"value":500000000, "account": env.alice.name}]]);
      await remoteA.execute('tx.create', [{"sendnow":true}, [{"value":500000000, "account": env.bob.name}]]);
      await remoteA.execute('miner.generate.admin', [1]);

      //在B链上为Alice和Bob充值
      await remoteB.execute('tx.create', [{"sendnow":true}, [{"value":500000000, "account": env.alice.name}]]);
      await remoteB.execute('tx.create', [{"sendnow":true}, [{"value":500000000, "account": env.bob.name}]]);
      await remoteB.execute('miner.generate.admin', [1]);

      console.log(`[第${i+1}轮]随机业务流程`);

      env.select = Math.random(); //每轮重新进行随机设定 

      //为Alice创建B链地址
      let ret = await remoteB.execute('address.create', [env.alice.name]);
      assert(ret.code == 0);
      env.alice.address = ret.result.address;
      env.alice.sa = ret.result.publicKey;

      //为Bob创建A链地址
      ret = await remoteA.execute('address.create', [env.bob.name]);
      assert(ret.code == 0);
      env.bob.address = ret.result.address;
      env.bob.sa = ret.result.publicKey;

      //Alice在A链上向Bob发起HTLC请求，使用Alice的B链地址锁定
      ret = await remoteA.execute('htlc.suggest', [{
        target: 'vallnet.main',
        alice: env.alice.address,   //Alice的B链地址
        bob: env.bob.address,       //Bob的A链地址
        amount: 100000000,          //交易金额
        rate: 1,                    //兑换比例
      }, env.alice.name]);
      assert(ret.code == 0);
      console.log('发布跨链合约(htlc.suggest)');
      
      //数据上链
      await remoteA.execute('miner.generate.admin', [1]);
      await remoteA.wait(2000);
    }
  });

  it('查询跨链交易', async () => {
      ret = await remoteA.execute('htlc.query', []);
      assert(ret.code == 0);
      console.log('合约查询(htlc.query), 现有合约数: ', ret.result.count);
    });
});