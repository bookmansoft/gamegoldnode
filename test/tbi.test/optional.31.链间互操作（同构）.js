/**
 * 可信区块链功能测试
 * 检验项目：
 *  (31). 链间互操作（同构）
 * 测试目的：验证同构区块链系统之间的跨链互通能力
    1.披露同构跨链互通方案，包括跨链互通方案技术路线、跨链交易存在性、正确性、事务性验证支持能力，以及身份互认、消息路由、共识转换、资源发现机制等，跨链方案应具备消息互通、事务性保障、身份互认能力。
    2.依披露演示验证，组装跨链交易，发送至跨链网络等，演示整个跨链流程（跨链交易可选为资产转移类交易，跨同构链）
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1. Alice向Bob的A链地址发起HTLC请求，使用她的B链地址锁定交易
    2. Bob在A链上收到该HTLC请求，他在B链上向Alice的B链地址发起HTLC应答，仍旧使用Alice的B链地址锁定交易
    3. Alice在B链上收到HTLC应答，立即在B链发起Deal交易进行提款，此时需要提交她的B链地址的公钥
    4. Bob在B链收到Alice.Deal交易通知，获取并利用Alice的B链地址的公钥，在A链上发起Deal交易
    5. Alice在A链上收到Bob.Deal交易通知，至此完成了整个业务流程
 * 预期结果：
    1. Alice和Bob在不同链上账户余额的变化符合预期
 */

//#region 引入SDK
const assert = require('assert');
const uuidv1 = require('uuid/v1');
const common = require('../../lib/remote/common');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const gamegold = require('gamegold');
const consensus = gamegold.consensus;
//#endregion

//#region 生成远程连接组件
 //连接A链
 const remoteA = connector({
  type:   'testnet',
  structured: true,
  ip: notes[0].ip,        //RPC地址
  port: notes[0].rpc,     //RPC端口
});
//连接B链
const remoteB = connector({
  type:   'main',
  structured: true,
});
const exec = require('child_process').exec; 
let net_main = null;
//#endregion

//#region 申明环境变量
let env = {
  alice: {name: `Alice-${uuidv1()}`,},
  bob: {name: `Bob-${uuidv1()}`,},
  transaction: 2,    //测试业务笔数
  random: false,     //设为true则交易流程带有随机性，设为false则交易流程确定完成
  running: false,
};
//#endregion

describe('链间互操作（同构）', () => {
   after(()=>{
     remoteA.close();
     remoteB.close();
   });
 
   before(async ()=>{
     //启动一个进程，运行一条独立链
     net_main = exec(`node index.js --genesis --debug=true --mining=false --network=main --password=bookmansoft --log-file=true --workers=true --workers-timeout=60000 --coin-cache=100000`, function(err, stdout, stderr) {
       if(err) {
           console.log(stderr);
       }
     });
     net_main.on('exit', () => { });
     await remoteA.wait(5000);
 
     //连接A链节点1，执行检测工作，确保A链拥有一定成熟度
     await remoteA.execute('miner.setsync.admin', [true]);
     let ret = await remoteA.execute('block.tips', []);
     if(ret.result[0].height < 120) {
       await remoteA.execute('miner.generate.admin', [120 - ret.result[0].height]);
     }
 
     //连接B链节点1，执行检测工作，确保B链拥有一定成熟度
     await remoteB.execute('miner.setsync.admin', [true]);
     ret = await remoteB.execute('block.tips', []);
     if(ret.result[0].height < 120) {
       await remoteB.execute('miner.generate.admin', [120 - ret.result[0].height]);
     }
 
     //使用WS协议连接A链节点1，监听跨链相关事件
     remoteA.setmode(remoteA.CommMode.ws, async () => { });
     remoteA.watch(async msg => {
       await remoteA.wait(2000);
 
       if(!env.random) {
         env.select = 0.34; //人为干预
       }
 
       //收到HTLC请求交易通知
       if(msg.account == env.bob.name) { //Bob收到了消息
         if(env.select > 0.33) { //一定概率下，Bob在B链发起HTLC应答交易
           let ret = await remoteB.execute('htlc.assent', [{
             src: msg.src,
             dst: msg.dst,
             hash: msg.shash, 
             index: msg.sidx, 
             amount: msg.amount, 
             rate: msg.rate, 
             ab: msg.ab,
             ba: msg.ba,
           }, env.bob.name]);
           assert(ret.code == 0);
           
           await remoteB.execute('miner.generate.admin', [6]);
           console.log('响应跨链合约(htlc.assent)');
         }
       } else { //Alice收到了消息
         if(env.select <= 0.33) { //一定概率下，Alice在A链发起HTLC请求取消交易
           await remoteA.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD*2]);//满足时延要求
           let ret = await remoteA.execute('htlc.suggest.cancel', [{
             txid: common.revHex(msg.shash), 
             index: msg.sidx, 
             sa: env.alice.sa, 
             aa: env.alice.aa,   //使用Alice的A链地址发起取消交易
           }, env.alice.name]);  //使用Alice的账号接收退款
           assert(ret.code == 0);
 
           //数据上链
           ret = await remoteA.execute('miner.generate.admin', [6]);
           assert(ret.code == 0);
           console.log('取消合约(htlc.suggest.cancel)');
           await print();
 
           env.running = false;
         }
       }
     }, 'htlcsuggest.receive').watch(async msg => {
       await remoteA.wait(2000);
 
       //收到HTLC请求提款交易
       if(msg.account == env.alice.name) { //Alice收到了消息
         //合约执行完毕，验证合约状态
         assert(msg.pst, 4);
         console.log('合约履行完毕(contract finished)');
 
         await remoteA.execute('miner.generate.admin', [12]);
         await print();
 
         env.running = false;
       }
     }, 'htlcsuggest.deal');
 
     //使用WS协议连接B链节点1，监听跨链相关事件
     remoteB.setmode(remoteA.CommMode.ws, async () => { });
     remoteB.watch(async msg => {
       await remoteA.wait(2000);
 
       if(!env.random) {
         env.select = 0.67; //人为干预
       }
 
       //收到HTLC应答交易通知
       if(msg.account == env.alice.name) { //Alice收到了消息
         if(env.select > 0.66) { //一定概率下，Alice在B链发起提款交易
           let ret = await remoteB.execute('htlc.assent.deal', [{
             txid: common.revHex(msg.ahash), 
             index: msg.aidx, 
             sa: env.alice.sa
           }, env.alice.name]);
           assert(ret.code == 0);
           
           await remoteB.execute('miner.generate.admin', [6]);
           console.log('兑现响应(htlc.assent.deal)');
         }
       } else { //Bob收到了消息
         if(env.select <= 0.66) { //一定概率下，Bob在B链发起了应答取消交易
           await remoteB.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD]);//满足时延要求
           let ret = await remoteB.execute('htlc.assent.cancel', [{
             txid: common.revHex(msg.ahash), 
             index: msg.aidx, 
             bb: msg.bb,       //使用Bob的B链地址发起取消交易
           }, env.bob.name]);  //使用Bob的账户接收退款
           assert(ret.code == 0);
           
           ret = await remoteB.execute('miner.generate.admin', [6]);
           assert(ret.code == 0);
           console.log('取消响应(htlc.assent.cancel)');
         }
       }
     }, 'htlcassent.receive').watch(async msg => {
       await remoteA.wait(2000);
 
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
         
         ret = await remoteA.execute('miner.generate.admin', [6]);
         assert(ret.code == 0);
       }
     }, 'htlcassent.deal').watch(async msg => {
       await remoteA.wait(8000);
 
       //收到HTLC应答取消交易
       if(msg.account == env.alice.name) { //Alice收到了消息
         await remoteA.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD*2]); //满足时延要求
         //Alice在A链发起取消交易
         let ret = await remoteA.execute('htlc.suggest.cancel', [{
           txid: common.revHex(msg.shash), 
           index: msg.sidx, 
           sa: env.alice.sa, 
           aa: env.alice.aa,   //使用Alice的A链地址发起取消交易
         }, env.alice.name]);  //使用Alice的账号接收退款
         assert(ret.code == 0);
 
         //数据上链
         ret = await remoteA.execute('miner.generate.admin', [6]);
         assert(ret.code == 0);
         console.log('取消合约(htlc.suggest.cancel)');
         await print();
         
         env.running = false;
       }
     }, 'htlcassent.cancel');
   });
 
   it(`发起跨链交易：连续发起${env.transaction}笔跨链交易，并随机不同交易流程如成交/取消`, async () => {
     for(let i=0; i<env.transaction; i++) {
       //连接A链节点1，为账户Alice充值
       await remoteA.execute('tx.create', [{"sendnow":true}, [{"value":200000000, "account": env.alice.name}]]);
       //连接B链节点1，为账户Bob充值
       await remoteB.execute('tx.create', [{"sendnow":true}, [{"value":200000000, "account": env.bob.name}]]);
     }
     await remoteA.execute('miner.generate.admin', [3]);
     await remoteB.execute('miner.generate.admin', [3]);
     await remoteA.wait(6000);
 
     //连接B链节点1，为Alice在B链上创建专用地址
     let ret = await remoteB.execute('address.create', [env.alice.name]);
     assert(ret.code == 0);
     env.alice.ab = ret.result.address;
     env.alice.sa = ret.result.publicKey;
 
     //连接A链节点1，为Bob在A链上创建专用地址
     ret = await remoteA.execute('address.create', [env.bob.name]);
     assert(ret.code == 0);
     env.bob.ba = ret.result.address;
     env.bob.sa = ret.result.publicKey;
 
     await print();
 
     //反复执行多轮相互独立的跨链事务测试
     for(let i = 0; i < env.transaction; i++) { 
       console.log(`[第${i+1}轮]随机业务流程`);
 
       env.running = true;
 
       env.select = Math.random(); //每轮重新进行随机设定 
 
       //连接A链节点1，使用Alice账户向Bob发起HTLC请求，使用Alice的B链地址锁定交易
       ret = await remoteA.execute('htlc.suggest', [{
         target: 'vallnet.main',
         ab: env.alice.ab,         //Alice的B链地址
         ba: env.bob.ba,           //Bob的A链地址
         amount: 100000000,        //交易金额
         rate: 1,                  //兑换比例
       }, env.alice.name]);
       assert(ret.code == 0);
       env.alice.aa = ret.result.aa;
       console.log('发布跨链合约(htlc.suggest)');
       
       //连接A链节点1，执行共识记账操作
       await remoteA.execute('miner.generate.admin', [1]);
 
       while(env.running) {
         await remoteA.wait(1000);
       }
     }
   });
 
   it('查询跨链交易', async () => {
      //连接B链节点1，下达关闭服务器指令
      let ret = await remoteB.execute('sys.stop.admin', []);
      await remoteA.wait(2000);
        
      //连接A链节点1，查询并打印跨链合约信息
      ret = await remoteA.execute('htlc.query', []);
      assert(ret.code == 0);
      console.log('合约查询(htlc.query), 现有合约数: ', ret.result.count);
   });
 });
 
 async function print() {
   let ret = await remoteA.execute('balance.all', [env.alice.name]);
   assert(ret.code == 0);
   console.log(env.alice.name, (ret.result.confirmed/100000000).toFixed(2));
 
   ret = await remoteB.execute('balance.all', [env.alice.name]);
   assert(ret.code == 0);
   console.log(env.alice.name, (ret.result.confirmed/100000000).toFixed(2));
 
   ret = await remoteB.execute('balance.all', [env.bob.name]);
   assert(ret.code == 0);
   console.log(env.bob.name, (ret.result.confirmed/100000000).toFixed(2));
 
   ret = await remoteA.execute('balance.all', [env.bob.name]);
   assert(ret.code == 0);
   console.log(env.bob.name, (ret.result.confirmed/100000000).toFixed(2));
 }