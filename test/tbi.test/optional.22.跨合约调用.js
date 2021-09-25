/**
 * 可信区块链功能测试
 * 检验项目：
 *  (22). 跨合约调用
 * 测试目的：验证系统是否支跨合约调用
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1. 披露系统跨合约调用的规则
        //跨合约调用原理描述：在A合约内，通过发起一笔附加留言交易来调用B合约
        await send(
            {
                outputs: [{
                    address: dstAddress,    //B合约地址
                    value: value,           //调用费用
                }],
                comment: JSON.stringify({
                    oper: 'scrun',          //调用操作符
                    $tag: 'inner',          //嵌套标志
                    params: {},             //B合约传入参数
                }),
            }, 
            srcAddress,                     //A合约地址
        );
        //只有原始合约会通过网络传播，嵌套合约由共识节点本地计算并核验
    2. 创建合约A和B
    3. 在合约A中调用合约B的方法
 * 预期结果：
    1. 跨合约调用成功
 */

//#region 引入SDK
const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,     //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    recy: 3,               //单元测试循环次数
    contractA: {},
    contractB: {},
    alice: {},
};
//#endregion

describe('跨合约调用', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    for(let i = 0; i < env.recy; i++) {
        it('设立Alice账户，查询其当前余额', async () => {
            //连接节点1，设立演示账户Alice，查询并打印账户余额
            console.log(`------ [第 ${i+1} 轮测试开始] ------`);
            env.alice.name = uuid();
    
            let ret = await remote.execute('address.create', [env.alice.name]);
            assert(!ret.error);
            env.alice.address = ret.address;
            console.log(`${env.alice.name} 的地址: ${env.alice.address}`);
    
            ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            assert(ret == 0);
            console.log(`${env.alice.name} 的账户余额: ${ret}`);
        });
    
        it('建立智能合约B的实例', async () => {
            //连接节点1，发起调用，注册合约B
            console.log('注册合约B，调用该合约时将自动向指定地址转账');
            let ret = await remote.execute('sc.register', [
                {type: 'example',},
            ]);
            assert(ret.dst);
            //设置合约B地址
            env.contractB.address = ret.dst;
    
            //上链
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
    
            ret = await remote.execute('sc.query', [[['options.dst', env.contractB.address]]]);
            console.log(`合约B注册成功，地址${ret.list[0].options.dst}，当前版本: ${ret.list[0].options.ver}`);
        });
    
        it('建立智能合约A的实例', async () => {
            //连接节点1，发起调用，注册合约A，合约A内嵌对合约B的调用
            console.log('注册合约A，调用该合约时将自动调用合约B');
            let ret = await remote.execute('sc.register', [
                {type: 'relay',},
            ]);
            assert(ret.dst);
            //设置合约A地址
            env.contractA.address = ret.dst;
    
            //上链
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
    
            ret = await remote.execute('sc.query', [[['options.dst', env.contractA.address]]]);
            console.log(`合约A注册成功，地址${ret.list[0].options.dst}，当前版本: ${ret.list[0].options.ver}`);
        });
    
        it('直接调用合约B', async () => {
            //连接节点1，发起对合约B的调用
            let ret = await remote.execute('sc.run', [
                `${env.contractB.address},50000`,    //向合约A地址转账
                {
                    sim: env.alice.address,     //最终打款地址
                },
            ]);
    
            if(ret.error) {
                console.log(ret.error, env.contractB.address);
            }
            assert(!ret.error);
    
            //将上述交易上链，触发合约执行
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
        });
    
        it('查询Alice账户的当前余额', async () => {
            //连接节点1，查询并打印Alice账户余额，验证合约B正确执行
            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            assert(ret == 0.00025);
            console.log(`${env.alice.name} 的账户余额: ${ret}`);
        });
    
        it('间接调用合约B: 调用合约A，指定合约B地址及其附属参数', async () => {
            //连接节点1，发起对合约A的调用，间接调用合约B
            let ret = await remote.execute('sc.run', [
                `${env.contractA.address},50000`,    //向合约A地址转账
                {
                    relay: env.contractB.address,   //中继合约B的地址
                    params: {                       //中继合约B所需的参数。为避免参数名称冲突，将所有中继参数打包发送
                        sim: env.alice.address,     //最终打款地址
                    }
                },
            ]);
    
            if(ret.error) {
                console.log(ret.error, `A(${env.contractA.address}) -> B${env.contractB.address}`);
            }
            //断言操作成功
            assert(!ret.error);
    
            //将上述交易上链，触发合约执行
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
        });
    
        it('查询Alice账户的当前余额', async () => {
            //连接节点1，查询并打印Alice账户余额，通过额度变化，验证了合约A得到了正确执行
            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            //断言余额的正确数值为 0.0005
            assert(ret == 0.0005);
            console.log(`${env.alice.name} 的账户余额: ${ret}`);
        });
    }
});