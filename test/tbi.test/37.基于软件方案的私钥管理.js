/**
 * 联机单元测试：基于软件方案的私钥管理
 * @description
    验证基于软件方案的产品具备私钥管理的能力，披露软件层面的私钥管理方案（用户保管或提供私钥托管服务），以及交易签名策略（用户端签署或Server端签署），并演示验证：
    1.注册用户，申请私钥，并查看私钥申请结果，及存储信息
    2.该用户发起交易
    注：禁止私钥明文传输，及明文存储
    
    预期结果：交易签名验签成功，交易正常执行
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

let env = {
    alice: {
        name: uuid(),
        address: '',
    },
    utxo: {},
    address: null,
}

describe('基于软件方案的私钥管理', () => {
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

    it('Alice注册用户账户', async () => {
        let ret = await remote.execute('account.create', [{name: env.alice.name}]);
        assert(!ret.error);
        console.log(`Alice成功注册新账号: ${env.alice.name}`);
    });

    it('Alice申请私钥，系统返回该私钥对应地址', async () => {
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.result.address;
        console.log(`Alice获得了新地址: ${env.alice.address}`);

        ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
    });

    it('向Alice的新地址转账', async () => {
        let ret = await remote.execute('tx.send', [env.alice.address, 100000000]);
        assert(!ret.error);
        console.log('Alice得到新的UTXO');
        console.log('-hash:', ret.result.hash); //此处虽然返回参数名为hash，其实却是txid
        console.log('-index:', 0);
        console.log('-value:', ret.result.outputs[0].value);

        env.utxo.txid = ret.result.hash;
        env.utxo.vout = 0;

        await remote.execute('miner.generate.admin', [1]);

        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        console.log(`Alice当前余额: ${ret.result}`);
    });

    it('Alice动用私钥花费该UTXO', async () => {
        let ret = await remote.execute('tx.create', [
            {'sendnow':true, in:[{hash: env.utxo.txid, index: env.utxo.vout}]}, 
            [{address: env.address, value: 99990000}]
        ]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);

        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        console.log(`Alice当前余额: ${ret.result}`);
    });
});
