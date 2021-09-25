/**
 * 可信区块链功能测试
 * 检验项目：
 *  (14). 无故障与无欺诈的共识
 * 测试目的：
 *  验证产品在无故障和无欺诈的情况下达成共识的能力
 * 前置条件：
 *  系统已经运转一段时间，确保集群无故障节点和无欺诈节点
 * 测试流程：
 *  1.发起一笔合法转账请求
 *  2.发起一笔非法转账请求
 * 预期结果：
 *  1.合法转账请求共识成功
 *  2.非法转账请求共识失败
 */

//#region 引入SDK
const assert = require('assert');
const uuid = require('uuid/v1');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {name: `Alice-${uuid()}`,},
};
//#endregion

describe('无故障与无欺诈的共识', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    it('生成Alice账户', async () => {
        //通过SDK连接节点1，生成演示账户和相关地址
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.result.address;

        ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
    });

    it('合法转账', async () => {
        //通过SDK连接节点1，向Alice账户发起一笔合法转账交易
        console.log('向Alice账户发起一笔合法转账请求');
        let ret = await remote.execute('tx.send', [env.alice.address, 100000000]);
        //断言交易成功
        assert(!ret.error);
    });

    it('形成共识', async () => {
        //通过SDK连接节点1，发起共识记账操作
        console.log('发起共识流程');
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);

        //查询并打印Alice账户余额(confirmed)，发现转账金额已经累加至账户余额中
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        console.log('达成共识，Alice账户余额增至:', ret.result);
    });

    it('非法转账', async () => {
        //通过SDK连接节点1，向Alice账户发起一笔非法转账交易(转账金额超过账户余额)
        console.log('Alice账户向第三方发起一笔非法转账请求：转账金额为2, 超过账户余额');
        let ret = await remote.execute('tx.send', [env.address, 200000000, env.alice.name]);
        //断言交易失败
        assert(!!ret.error);
        //打印错误信息
        console.log(ret.error);
    });
});
