/**
 * 联机单元测试：本地全节点提供运行时环境
 */

/**
 * 交易对合约的状态
 */
const contractStatus = {
    None: 0,            //不存在的交易
    CreatedOnMem:2,     //于内存中创建
    Promised: 3,        //签署状态
    Confirmed: 4,       //验资通过状态
    Expired: 5,         //逾期失效状态
};

//引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
  
//一个有效的、含有一定余额的比特币地址，用于预言机检测
let dt = {type:1, addr: '1EzwoHtiXB4iFwedPr49iywjZn2nnekhoj'};
dt.id = `${dt.type}.${dt.addr}`;

let env = {}; //在多个测试用例间传递中间结果的缓存变量

describe('交易对业务流程', () => {
    it('创建并提交一个交易对合约', async () => {
        console.log('create前账户信息', await remote.execute('balance.all', []));

        await remote.execute('contract.create', [dt.type, 300000000, 3000000, dt.addr]);

        //由于系统广泛使用了异步消息系统，每个消息的处理句柄虽然使用了async和await语法，但系统级的调用者使用Reflect.apply进行调用，从而失去了同步特性
        //因此业务提交后，等待一段时间再去获取数据（例如余额）才会比较准确
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
        console.log('create后账户信息', await remote.execute('balance.all', []));
    });

    it('查询列表，选择并签署交易', async () => {
        env.list = await remote.execute('contract.list', [1, 1, [dt.id]]);
        if(env.list && env.list.length > 0) {
            console.log(env.list[0]);
            let ret = await remote.execute('contract.promise', [env.list[0].id]);

            //等待一段较长的时间，以便节点进行交易对的跨网确认
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(15000);

            console.log('promise后账户信息', await remote.execute('balance.all', []));
        }
    });

    it('查询列表，选择并执行交易', async () => {
        env.list = await remote.execute('contract.mine', [1, 1, [dt.id]]);
        if(env.list && env.list.length > 0) {
            if(env.list[0].transStatus == contractStatus.Confirmed) {
                await remote.execute('contract.execute', [env.list[0].id, 2]); //假设接单者完成了真实的充值，则接单者可以顺利执行、获取对应的游戏金，否则执行失败
    
            }
            else if(env.list[0].transStatus == contractStatus.Expired) {
                await remote.execute('contract.execute', [env.list[0].id, 1]); //假设单据超时，则发单者可以顺利执行、获取对应的交易保证金，否则执行失败
            }
            else {
                return;
            }

            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            console.log('execute后账户信息', await remote.execute('balance.all', []));

            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            await remote.execute('miner.generate', [1]);

            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            console.log('记账后的账户信息', await remote.execute('balance.all', []));
        }
    });

    it('记账', async ()=>{
        await remote.execute('miner.generate', [2]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
        console.log('记账后的账户信息', await remote.execute('balance.all', []));
    });
});