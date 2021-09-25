/**
 * 可信区块链功能测试
 * 检验项目：
 *  (40). SDK支持方案
 * 测试目的：验证应用层集成SDK与区块链交互的能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.披露SDK支持语言：目前支持 Javascript SDK
    2.依披露，使用相关SDK，发起交易
 * 预期结果：演示与披露内容一致，交易成功
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
    alice: {
        name: uuid(),
        address: '',
    },
}
//#endregion

describe('SDK支持方案', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    after(()=>{
        remote.close();
    });

    it('发起交易前', async () => {
        //使用基于JavaScript的SDK，连接节点1，查询Alice账户的余额
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        //断言操作成功
        assert(!ret.error);
        console.log(`账户${env.alice.name}余额:`, ret.result);
    });

    it('发起交易', async () => {
        //使用基于JavaScript的SDK，连接节点1，向Alice账户发起转账
        let ret = await remote.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作成功
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        //使用基于JavaScript的SDK，连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1500);
    });

    it('发起交易后', async () => {
        //使用基于JavaScript的SDK，连接节点1，查询Alice账户，发现转账金额已到账
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        //断言操作成功
        assert(!ret.error);
        console.log(`账户${env.alice.name}余额:`, ret.result);
    });
});
