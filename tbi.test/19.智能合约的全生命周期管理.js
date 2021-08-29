/**
 * 联机单元测试：智能合约的全生命周期管理
 * @description
    验证智能合约是否能全生命周期管理，确保应用层的稳定运转
    1.披露区块链系统支持的智能合约语言与相应的执行环境
    本系统使用基于逆波兰式的堆栈脚本(Stack Script)书写智能合约，采用内置堆栈脚本解释执行器作为智能合约执行引擎
    出于安全性考虑，当前版本不允许终端用户自行发布合约模板，终端用户只能选取系统内置合约模板发布智能合约实例
    系统版本更新时，会因需对合约模板库进行维护或扩充
    
    2.区块链网络上编译部署智能合约 sc.register
    3.通过提交智能合约交易来执行智能合约 sc.run
    4.冻结并发送交易 sc.register state=2, sc.run
    5.解冻并发送交易 sc.register state=1, sc.run
    6.智能合约的销毁 sc.register state=3, sc.run
    7.销毁后发送交易 sc.run
    
    预期结果：
    1.智能合约成功部署在区块链网络
    2.发送的消息成功激活智能合约，并有相关执行日志
    3.智能合约根据特定条件完成冻结、解冻、销毁流程
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

let env = {
    contract: {},
};

describe('智能合约的全生命周期管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('选取模板，建立一个智能合约实例', async () => {
        //注册合约
        let ret = await remote.execute('sc.register', [
            {type: 'example',},
        ]);
        assert(ret.dst);
        //设置合约地址
        env.contract.address = ret.dst;

        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('执行智能合约：成功', async () =>{
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        assert(!ret.error);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('冻结智能合约', async () =>{
        await remote.execute('sc.register', [
            {oper: 'change', dst: env.contract.address, state: 2},
        ]);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('执行智能合约：失败', async () =>{
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('解冻智能合约', async () =>{
        await remote.execute('sc.register', [
            {oper: 'change', dst: env.contract.address, state: 1},
        ]);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('执行智能合约：成功', async () =>{
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        assert(!ret.error);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('销毁智能合约', async () =>{
        await remote.execute('sc.register', [
            {oper: 'change', dst: env.contract.address, state: 3},
        ]);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('Alice执行智能合约：失败', async () =>{
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        assert(!!ret.error);
        console.log(ret.error);
    });
});
