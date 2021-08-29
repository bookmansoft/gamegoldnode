/**
 * 联机单元测试：账户类型及交易类型
 * @description
    披露账户类型以及支持的转账交易情况，账户类型为UTXO模型，转账交易应支持一对一、一对多、多对多交易等，并演示验证：
    1.发起资产转移类交易，包括，一对一、一对多、多对多交易
    2.查看交易结果，交易应成功，相关账户的资产信息更新成功
    3.查询账户的交易流水，应包含新增的交易信息
    
    预期结果：披露与演示一致，交易成功，资产信息更新成功，交易流水可追溯
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});
const MTX = remote.gamegold.mtx;

let env = {
    alice: {
        name: 'alice',
        address: [],
    },
    tx: {},
}

describe('账户类型及交易类型', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    after(()=>{
        remote.close();
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
        await remote.wait(2000);
    });

    it('创建一笔交易数据并签名', async () => {
        let ret = await remote.execute('tx.create', [{"sendnow":false}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
        env.tx = ret.result;
    });

    it('发送交易(正确性验证与一致性验证)', async () => {
        env.tx.outputs[0].value = 2000000;
        let ret = await remote.execute('tx.raw.send', [MTX.fromJSON(env.tx).toRaw().toString('hex')]);
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        await remote.execute('miner.generate.admin', [1]);
    });
});
