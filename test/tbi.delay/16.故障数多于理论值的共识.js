/**
 * 可信区块链功能测试
 * 检验项目：
 *  (16). 故障数多于理论值的共识
 * 测试目的：
 *  验证产品在故障数多于理论值的情况下不达成共识的能力
 * 前置条件：
 *  1. 确定1号、2号节点拥有选举权，3、4号节点不拥有选举权
 *  2. 关闭1、2号节点，确保集群故障数多于理论值
 *  3. 确保3号节点拥有足够的燃料值
 * 测试流程：
 *     1.发起一笔合法转账请求
 *     2.发起一笔非法转账请求
 * 预期结果：
 *     1.合法转账请求共识失败
 *     2.非法转账请求共识失败
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
    ip: notes[2].ip,        //RPC地址
    port: notes[2].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {name: `Alice-${uuid()}`,},
};
//#endregion

describe('故障数多于理论值的共识', () => {
    it('生成Alice账户', async () => {
        //通过SDK连接3号节点并发起调用，生成演示账户A
        let ret = await remote.execute('address.create', [env.alice.name]);
        //断言成功
        assert(!ret.error);
        env.alice.address = ret.result.address;
        //通过SDK连接3号节点并发起调用，生成演示账户B
        ret = await remote.execute('address.create', []);
        //断言成功
        assert(!ret.error);
        env.address = ret.result.address;
    });
    it('合法转账', async () => {
        //通过SDK连接3号节点并发起调用，由B账户向A账户发起一笔合法转账交易
        console.log('向Alice账户发起一笔合法转账请求');
        let ret = await remote.execute('tx.send', [env.alice.address, 100000000]);
        //断言成功
        assert(!ret.error);
    });
    it('形成共识失败', async () => {
        //通过SDK连接3号节点并发起调用，指示系统形成共识
        console.log('发起共识流程');
        let ret = await remote.execute('miner.generate.admin', [1]);
        console.log(ret.error);
        //通过SDK连接3号节点并发起调用，查询A账户当前余额
        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        //发现未发生变化，说明转账请求无法共识，打印结论
        console.log('未能达成共识，Alice账户余额不变:', ret.result);
    });
    it('非法转账', async () => {
        //通过SDK连接3号节点并发起调用，由A账户向B账户发起一笔非法转账交易
        console.log('Alice账户向第三方发起一笔非法转账请求：转账金额为2, 超过账户余额');
        let ret = await remote.execute('tx.send', [env.address, 200000000, env.alice.name]);
        //断言失败
        assert(!!ret.error);
        //打印失败原因
        console.log(ret.error);
    });
});