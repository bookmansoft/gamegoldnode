/**
 * 可信区块链功能测试
 * 检验项目：
 *  (8). 消息防篡改
 * 测试目的：
    验证系统的消息防篡改能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
 *  1.篡改交易中的金额信息
 *  2.发送篡改后的交易到链上
 * 预期结果：
 *  1. 交易失败，并给出相关提示
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const uuid = require('uuid/v1')
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
    tx: {},
}
//#endregion

describe('消息防篡改', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);

        //通过SDK连接节点1，创建Alice账户
        await remote.execute('account.create', [{name: env.alice.name}]);
    });

    it('创建一笔交易数据并签名', async () => {
        //通过SDK连接节点1，生成一笔由普通账户向Alice账户转账的交易信息并签名，但不发送至联盟链
        let ret = await remote.execute('tx.create', [{"sendnow":false}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
        env.tx = ret.result;
    });

    it('篡改交易数据中的转账金额后，发送交易: 报错', async () => {
        //篡改已生成交易数据中的转账金额
        env.tx.outputs[0].value = 5000000;
        //通过SDK连接节点1，发送被篡改的交易数据至联盟链
        let ret = await remote.execute('tx.raw.send', [remote.gamegold.mtx.fromJSON(env.tx).toRaw().toString('hex')]);
        //断言交易发送失败，打印失败原因
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('修复数据后再次发送交易：成功', async () => {
        //恢复已生成交易数据中的转账金额为原始数值
        env.tx.outputs[0].value = 2000000;
        //通过SDK连接节点1，发送交易数据至联盟链
        let ret = await remote.execute('tx.raw.send', [remote.gamegold.mtx.fromJSON(env.tx).toRaw().toString('hex')]);
        //断言交易发送成功
        assert(!ret.error);

        //通过SDK连接节点1，指示节点形成共识
        //@note tx.raw.send没有通过钱包，而是直接通过节点发送，如果数据不上链而重复执行该脚本，易引发双花报错
        await remote.execute('miner.generate.admin', [1]);
    });
});
