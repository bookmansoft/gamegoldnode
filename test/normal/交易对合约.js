/**
 * 联机单元测试：本地全节点提供运行时环境
 */
const uuid = require('uuid/v1');
const assert = require('assert');
//创建授权式连接器实例
const remote = (require('../lib/remote/connector'))({structured: true})

/**
 * 交易对合约的状态
 */
const contractStatus = {
    None: 0,            //不存在的交易
    CreatedOnMem:2,     //于内存中创建
    Obsolete: 3,        //过时(无人承兑)--由于并无上链,实际并不存在    
    Promised: 4,        //签署状态
    Expired: 5,         //逾期失效状态(承兑超时)
    Confirmed: 6,       //验资通过状态    
    Exchanged: 7,       //兑换执行状态(乙方获得游戏金)
    Backed: 8           //兑换退回状态(甲方获得游戏金)
};

//为了能顺利用已有比特币余额的地址创建交易对,测试前必须注释相关代码--移到doc中去
//1.consensus.js:
/*
exports.TRANSACTION_PERIOD = 2;
*/
//2.wallet.js
/*
await facade.checkSum
*/

//一个有效的、不含有余额的测试网比特币地址，用于预言机检测交易对失效
let dt = {type:1, addr: 'mxW3x8USHPHUKwoSs1xxDodr1JSk8G6nKn'};
dt.id = `${dt.type}.${dt.addr}`;

//一个有效的、含有一定余额的测试网比特币地址，用于预言机检测交易对有效
let dt_contained = {type:1, addr: 'mxdjCSvXDke6WCH8gU99biSDGEHFf4eDpZ'};
dt_contained.id = `${dt_contained.type}.${dt_contained.addr}`;



//CP
let cp = {
    name: 'contract-cp'+ uuid().slice(0,25),
    id: '',
};

//alice
let alice = {
    name: 'contract-alice-'+ uuid().slice(0,21),
    addr: '',
};

//bob
let bob = {
    name: 'contract-bob-'+ uuid().slice(0,23),
    addr: '',
};

let env = {}; //在多个测试用例间传递中间结果的缓存变量

describe.skip('交易对业务流程', () => {
    it('准备工作-保证创世区块成熟', async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', []);

        //检测块高度，必要时进行挖矿以确保创世区块成熟
        let ret = await remote.execute('block.count', []);
        if(ret.result < 100) {
            for(let i = ret.result[0].height; i < 101; i++) {
                await remote.execute('miner.generate.admin', [1]);
                await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1500);
            }
            ret = await remote.execute('block.count', []);
        }
        //记录当前高度
        env.curHeight = ret.result;
    });

    it('为Alice和Bob创建账号,并转一定金额游戏金给Alice,用来发布交易对', async () => {
        //注册一个新的CP
        let ret = await remote.execute('cp.create', [cp.name, 'http://127.0.0.1']);
        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);

        //查询并打印CP信息
        ret = await remote.execute('cp.byName', [cp.name]);
        cp.id = ret.result.cid;

        //在该CP下注册用户子帐号, 记录其专属地址
        ret = await remote.execute('cp.user', [cp.id, alice.name]);
        alice.cid = cp.id;
        alice.addr = ret.result.data.addr;
        
        ret = await remote.execute('cp.user', [cp.id, bob.name]);
        bob.cid = cp.id;
        bob.addr = ret.result.data.addr;

        //为Alice转账
        await remote.execute('tx.send', [alice.addr, 1000000000]);

        //确保该转账数据上链
        await remote.execute('miner.generate.admin', [5]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(20000);
    });

    describe.skip('测试Alice发布交易对后无人承兑过期', () => {
        it('Alice创建并提交一个交易对合约', async () => {
            env.blanceBeforeCreate =  await remote.execute('balance.all', [alice.name]);
            console.log('create前账户信息: ', env.blanceBeforeCreate);

            await remote.execute('contract.create', [dt.type, 300000000, 300000, dt.addr, alice.name]);
            //由于系统广泛使用了异步消息系统，每个消息的处理句柄虽然使用了async和await语法，但系统级的调用者使用Reflect.apply进行调用，从而失去了同步特性
            //因此业务提交后，等待一段时间再去获取数据（例如余额）才会比较准确
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            
            const blanceAfterCreate = await remote.execute('balance.all', [alice.name]);          
            console.log('create后账户信息', blanceAfterCreate);
            //比对交易对创建前后余额,发布了交易对,金额应该减少了
            assert(env.blanceBeforeCreate.result.unconfirmed > blanceAfterCreate.result.unconfirmed);
        });

        it('交易对无人承兑,', async () => {
            // 挖150个块,使得交易对过期
            // 可以修改测试值,需要配合consensusjs的BLOCK_DAY测试
            for(let i = 0; i < 150; i++) {
                await remote.execute('miner.generate.admin', [1]);
                await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
            }
            ret = await remote.execute('block.count', []);
            //记录当前高度
            env.curHeight = ret.result;

            const blanceAfterObsolete = await remote.execute('balance.all', [alice.name]);
            console.log('Obsolete后账户信息:', blanceAfterObsolete);
            //比对交易对挖矿前后余额,由于已经超时,金额应该回到原账号
            const blanceChange = env.blanceBeforeCreate.result.unconfirmed - blanceAfterObsolete.result.unconfirmed
            console.log('Obsolete后账户变化:', blanceChange);
            assert(blanceChange < 100000 );
        });
    });

    describe.skip('Bob承兑交易对后并无转入比特币,交易对过期', () => {
        it('Alice创建并提交一个交易对合约,Bob签署交易', async () => {
            await remote.execute('contract.create', [dt.type, 400000000, 400000, dt.addr, alice.name]);
            //业务提交后，等待一段时间再去获取数据（例如余额）才会比较准确
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            //承诺兑换
            await remote.execute('contract.promise', [dt.id, bob.name]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(200);
            //查询bob-contract的交易对
            const ret = await remote.execute('contract.mine', [bob.name]);
            // 判断ret状态            
            assert (ret.result[0].transStatus === contractStatus.Promised);
            
        });

        it('Bob未转入比特币,无法承兑,Alice可以拿回交易对中游戏金', async () => {
            // 挖150个块,使得交易对过期
            // 可以修改测试值,需要配合consensusjs的BLOCK_DAY测试
            for(let i = 0; i < 150; i++) {
                await remote.execute('miner.generate.admin', [1]);
                await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
            }
            ret = await remote.execute('block.count', []);
            //记录当前高度
            env.curHeight = ret.result;
            //等待一段较长的时间，以便节点进行交易对的检查
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(15000);
            //Bob尝试兑换交易对,失败!
            const bobExecute = await remote.execute('contract.execute', [dt.id, 2]);
            assert(!!bobExecute.error);
            //Alice尝试拿回交易对游戏金,成功
            const aliceExecute = await remote.execute('contract.execute', [dt.id, 1]);
            assert(!aliceExecute.error);
            //兑换上链
            await remote.execute('miner.generate.admin', [1]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);

            const blanceAfterExecuted = await remote.execute('balance.all', [alice.name]);
            console.log('Executed后Alice-contract账户余额:', blanceAfterExecuted);
        });
    });

    describe.skip('Bob承兑交易对后并转入比特币', () => {
        it('Alice创建并提交一个交易对合约,Bob签署交易', async () => {
            // 注意create交易会验证地址是否已经用过,测试可放开该条件限制,保证后续判断的正确
            await remote.execute('contract.create', [dt_contained.type, 500000000, 500000, dt_contained.addr, alice.name]);
            //业务提交后，等待一段时间再去获取数据（例如余额）才会比较准确
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            env.list = await remote.execute('contract.list', [1, 1, [dt_contained.id]]);
            if(env.list && env.list.length > 0) {
                console.log(env.list[0]);
                let ret = await remote.execute('contract.promise', [dt_contained.id, bob.name]);
                //判断ret状态
                assert (ret.transStatus === contractStatus.Promised);
            }
        });

        it('Bob承兑,Alice无法拿回交易对中游戏金', async () => {
            //兑换上链
            await remote.execute('miner.generate.admin', [1]);
            //等待一段较长的时间，以便节点进行交易对的检查
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(15000);

            //Alice尝试拿回交易对游戏金,失败!
            const aliceExecute = await remote.execute('contract.execute', [dt_contained.id, 1, alice.name]);
            assert(!!aliceExecute.error);

            //Bob尝试兑换交易对,成功
            const bobExecute = await remote.execute('contract.execute', [dt_contained.id, 2, bob.name]);
            assert(!bobExecute.error);
            
            //兑换上链
            await remote.execute('miner.generate.admin', [1]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
        });
    });
 

    describe.skip('查询交易对状态', () => {
        it('查询Alice交易对状态', async ()=>{
           
        });
        it('查询Bob交易对状态', async ()=>{
           
        });
    });    
});