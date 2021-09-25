/**
 * 可信区块链功能测试
 * 检验项目：
 *  (33). 链下数据互操作
 * 测试目的：验证链上链下数据安全可信交互能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.披露链上链下交互方案，重点披露如何保证数据交互过程的安全可信，包括数据来源可信、传输过程可信、执行结果可信等
    2.链上链下交互演示：
        1）链上从链下获取数据；
        2）链下从链上获取数据；
 * 预期结果：
    1.与披露项一致
    2.链上链下数据交互演示成功
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const gamegold = require('gamegold');
const consensus = gamegold.consensus;
//#endregion

//#region 生成远程连接组件
const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

describe('链下数据互操作', () => {
    before(async () => {
        await remoteA.execute('miner.setsync.admin', [true]);
        let ret = await remoteA.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remoteA.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remoteA.wait(500);
    });

    it('链上从链下获取数据', async () => {
        //通过SDK连接节点1，发送预言机数据上链申请，等待其它节点的投票(赞同或反对)
        let ret = await remoteA.execute('oracle.send', ['state', 100, 1000000]);
        //断言操作成功
        assert(!ret.error);
    });

    it('形成共识', async () => {
        //通过SDK连接节点1，发起多次共识记账操作，直至成功切换一个新的投票周期
        await remoteA.execute('miner.generate.admin', [consensus.retargetInterval]);
        await remoteA.wait(1000);
    });

    it('链下从链上获取数据', async () => {
        //通过SDK连接节点1，查询已成功上链的预言机数据
        let ret = await remoteA.execute('oracle.check', ['state']);
        assert(!ret.error);
        //断言预言机数据的最终数值为100(没有其它节点参与竞争)
        assert(ret.result.k == 'state' && ret.result.v == 100);
    });
});