/**
 * 联机单元测试：智能合约的全生命周期管理
 * @description
    验证系统是否支跨合约调用
    1. 披露系统跨合约调用的规则
    2. 创建合约A和B
    3. 在合约A中调用合约B的方法

    预期结果：
    1. 跨合约调用成功
 */

const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

let env = {
    contract: {},
    alice: {name: uuid(), },
};

describe('智能合约的全生命周期管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('设立Alice账户，查询其当前余额', async () => {
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.result.address;

        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        console.log(`${env.alice.name} 的账户余额: ${ret.result}`);
    });

    it('选取模板，建立智能合约A的实例', async () => {
        //注册合约A
        console.log('注册合约A，调用该合约时将自动调用合约B');
        let ret = await remote.execute('sc.register', [
            {type: 'example1',},
        ]);
        assert(ret.dst);
        //设置合约A地址
        env.contract.address = ret.dst;

        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('选取模板，建立智能合约B的实例', async () => {
        //注册合约B
        console.log('注册合约B，调用该合约时将自动向指定地址转账');
        let ret = await remote.execute('sc.register', [
            {type: 'example',},
        ]);
        assert(ret.dst);
        //设置合约B地址
        env.contract.address1 = ret.dst;

        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('调用合约A，指定合约B地址及其附属参数', async () => {
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,    //向合约A地址转账
            {
                relay: env.contract.address1,   //中继合约B的地址
                params: {                       //中继合约B所需的参数。为避免参数名称冲突，将所有中继参数打包发送
                    sim: env.alice.address,     //最终打款地址
                }
            },
        ]);
        assert(!ret.error);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('查询Alice账户的当前余额', async () => {
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        console.log(`${env.alice.name} 的账户余额: ${ret.result}`);
    });
});