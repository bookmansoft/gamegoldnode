/**
 * 联机单元测试：消息防篡改
 * @description
    验证系统的消息防篡改能力
    1.篡改消息，如篡改交易中的金额信息，篡改签名后的交易内容等
    2.发送篡改后的交易到链上
    
    预期结果：
    交易失败，并给出相关提示
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

let env = {
    alice: {
        name: 'alice',
        address: '',
    },
    tx: {},
}

describe('消息防篡改', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        await remote.wait(500);

        await remote.execute('account.create', [{name: env.alice.name}]);
    });

    it('创建一笔交易数据并签名', async () => {
        let ret = await remote.execute('tx.create', [{"sendnow":false}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
        env.tx = ret.result;
    });

    it('篡改交易数据中的转账金额后，发送交易: 报错', async () => {
        env.tx.outputs[0].value = 5000000;
        let ret = await remote.execute('tx.raw.send', [remote.gamegold.mtx.fromJSON(env.tx).toRaw().toString('hex')]);
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('修复数据后再次发送交易：成功', async () => {
        env.tx.outputs[0].value = 2000000;
        let ret = await remote.execute('tx.raw.send', [remote.gamegold.mtx.fromJSON(env.tx).toRaw().toString('hex')]);
        assert(!ret.error);

        //tx.raw.send没有通过钱包，而是直接通过节点发送，如果数据不上链而重复执行该脚本，易引发双花报错
        await remote.execute('miner.generate.admin', [1]);
    });
});
