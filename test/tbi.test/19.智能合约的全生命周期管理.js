/**
 * 可信区块链功能测试
 * 检验项目：
 *  (19). 智能合约的全生命周期管理
 * 测试目的：
 *  验证智能合约是否能全生命周期管理，确保应用层的稳定运转
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
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
 * 预期结果：
    1.智能合约成功部署在区块链网络
    2.发送的消息成功激活智能合约，并有相关执行日志
    3.智能合约根据特定条件完成冻结、解冻、销毁流程
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    contract: {},
};
//#endregion

describe('智能合约的全生命周期管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('选取模板，建立一个智能合约实例', async () => {
        //连接节点1，选取合约模板、注册合约
        let ret = await remote.execute('sc.register', [
            {type: 'example',},
        ]);
        assert(ret.dst);
        //设置合约地址
        env.contract.address = ret.dst;

        //连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
    });

    it('执行智能合约：成功', async () =>{
        //连接节点1，执行上述已注册合约
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        //断言操作成功
        assert(!ret.error);

        //连接节点1，发起共识记账操作，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('冻结智能合约', async () =>{
        //连接节点1，冻结上述已注册合约
        await remote.execute('sc.register', [
            {oper: 'change', dst: env.contract.address, state: 2},
        ]);

        //连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('执行智能合约：失败', async () =>{
        //连接节点1，再次执行该合约
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        //断言操作失败，因为合约已被冻结。打印错误信息
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('解冻智能合约', async () =>{
        //连接节点1，解冻该合约
        await remote.execute('sc.register', [
            {oper: 'change', dst: env.contract.address, state: 1},
        ]);

        //连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('执行智能合约：成功', async () =>{
        //连接节点1，再次执行该合约
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        //断言操作成功
        assert(!ret.error);

        //连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('销毁智能合约', async () =>{
        //连接节点1，销毁该合约
        await remote.execute('sc.register', [
            {oper: 'change', dst: env.contract.address, state: 3},
        ]);

        //连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(3000);
    });

    it('Alice执行智能合约：失败', async () =>{
        //连接节点1，再次执行该合约
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        //断言操作失败，因为该合约已销毁。打印错误信息
        assert(!!ret.error);
        console.log(ret.error);
    });
});
