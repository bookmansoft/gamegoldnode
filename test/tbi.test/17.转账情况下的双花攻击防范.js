/**
 * 联机单元测试：转账情况下的双花攻击防范
 * @description
    验证产品在处理“双花攻击”的防范能力(系统已经运转一段时间，确保集群故障数少于理论值)
    1. 基于同一笔源交易发起两笔转账请求，且同时请求至不同节点
    
    预期结果：接收到被重放请求的节点拒绝“双花”的请求。均为其中一笔记账成功，另一笔作为“双花”交易记账失败
    1、一笔成功，一笔失败
 */

const assert = require('assert');
const uuid = require('uuid/v1');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

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

let env = {
    alice: {name: `Alice-${uuid()}`,},
};

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
        let ret = await remote.execute('coin.selectone', [{'len':1, 'value': 500000}]);
        assert(!ret.error);
        env.utxo = ret.result[0];
    });

    it('花费指定UTXO，向A节点提交一笔转账交易', async () => {
        let ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
        console.log(`将向地址${env.address}发起转账操作`);

        ret = await remote.execute('tx.create', [{'sendnow':true, in:[{hash: env.utxo.txid, index: env.utxo.vout}]},  [{address: env.address, value: 100000}]]);
        assert(!ret.error);
        await remote.wait(3500);
    });

    it('再次花费指定UTXO，向B节点提交一笔转账交易：失败', async () => {
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

        ret = await remoteB.execute('tx.raw.send', [MTX.fromJSON(env.tx).toRaw().toString('hex')]);
        assert(!!ret.error);
        console.log(ret.error);
    });
});
