/**
 * 可信区块链功能测试
 * 检验项目：
 *  (17). 转账情况下的双花攻击防范
 * 测试目的：
 *  验证产品在处理“双花攻击”的防范能力
 * 前置条件：
 *  系统已经运转一段时间，确保集群故障数少于理论值
 * 测试流程：
 *  1. 基于同一笔源交易发起两笔转账请求，且同时请求至不同节点
 * 预期结果：
 *  1. 接收到被重放请求的节点拒绝“双花”的请求。第一笔记账成功，另一笔作为“双花”交易记账失败
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
const MTX = remote.gamegold.mtx;
const remoteB = connector({
    structured: true,
    ip: notes[1].ip,        //RPC地址
    port: notes[1].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {name: `Alice-${uuid()}`,},
};
//#endregion

describe('转账情况下的双花攻击防范', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });
    it('查询并获得当前可用的一笔UTXO', async () => {
        //通过SDK连接至节点1，检索可用UTXO
        let ret = await remote.execute('coin.selectone', [{'len':1, 'value': 500000}]);
        assert(!ret.error);
        env.utxo = ret.result[0];
    });

    it('花费指定UTXO，向A节点提交一笔转账交易', async () => {
        let ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
        console.log(`将向地址${env.address}发起转账操作`);

        //通过SDK连接至节点1，花费选定UTXO，向指定地址发起转账交易
        ret = await remote.execute('tx.create', [{'sendnow':true, in:[{hash: env.utxo.txid, index: env.utxo.vout}]},  [{address: env.address, value: 100000}]]);
        //断言交易成功
        assert(!ret.error);
        await remote.wait(3500);
    });

    it('再次花费指定UTXO，向B节点提交一笔转账交易：失败', async () => {
        //通过SDK连接至节点1，花费同一笔UTXO，生成一笔转账交易数据，暂不发送
        let ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
        console.log(`将向地址${env.address}发起转账操作`);

        ret = await remote.execute('tx.create', [{'sendnow':false, 
            in:[{hash: env.utxo.txid, index: env.utxo.vout}]},  
            [{address: env.address, value: 100000}]
        ]);
        assert(!ret.error);
        env.tx = ret.result;

        await remote.wait(3500); //由于节点间交易数据同步需要一定时间，此处稍微停顿下

        //通过SDK切换连接到节点2，重放这笔交易数据
        ret = await remoteB.execute('tx.raw.send', [MTX.fromJSON(env.tx).toRaw().toString('hex')]);
        //断言交易发送失败，打印错误信息
        assert(!!ret.error);
        console.log(ret.error);
    });
});
