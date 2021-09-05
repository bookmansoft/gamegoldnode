/**
 * 联机单元测试：账户类型及交易类型
 * @description
    披露账户类型以及支持的转账交易情况，账户类型为UTXO模型，转账交易应支持一对一、一对多、多对多交易等，并演示验证：
    1.发起资产转移类交易，包括，一对一、一对多、多对多交易
    2.查看交易结果，交易应成功，相关账户的资产信息更新成功
    3.查询账户的交易流水，应包含新增的交易信息
    
    预期结果：披露与演示一致，交易成功，资产信息更新成功，交易流水可追溯

    操作流程：
    1. 设立Alice和Bob两个账户，分别申请多个地址
    2. 为上述账户地址转账以形成可用的UTXO
    3. Alice先后采用1对1、1对多、多对多形式，向Bob名下地址转账
    4. 查询Alice和Bob账户余额，持续观察变化
    5. 查询账户交易流水列表
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')
const uuid = require('uuid/v1')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

let env = {
    alice: {
        name: uuid(),
        address: [],
        utxo: [],
    },
    bob: {
        name: uuid(),
        address: [],
        utxo: [],
    },
}

describe('账户类型及交易类型', () => {
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

    it('为Alice和Bob设立账户，生成多个专属地址', async () => {
        for(let i = 0; i < 5; i++) {
            let ret = await remote.execute('address.create', [env.alice.name]);
            assert(!ret.error);
            env.alice.address.push(ret.result.address);

            ret = await remote.execute('tx.send', [ret.result.address, 20000000]);
            env.alice.utxo.push({hash: ret.result.hash, index: 0});

            ret = await remote.execute('address.create', [env.bob.name]);
            assert(!ret.error);
            env.bob.address.push(ret.result.address);
        }
    });

    it('查询账户余额', async () => {
        console.log('查询账户余额');
        let ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        console.log(`  Alice: ${ret.result}}`);
        ret = await remote.execute('balance.unconfirmed', [env.bob.name]);
        console.log(`  Bob: ${ret.result}}`);
    });

    it('1对1转账', async () => {
        console.log(`Alice采用1对1形式，向地址${env.bob.address[0]}发起转账操作`);
        let ret = await remote.execute('tx.create', [
            {
                'sendnow':true, 
                in:[env.alice.utxo[0], ]
            },
            [{address: env.bob.address[0], value: 10000000}, ]
        ]);
        assert(!ret.error);
    });

    it('查询账户余额', async () => {
        console.log('查询账户余额');
        let ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        console.log(`  Alice: ${ret.result}}`);
        ret = await remote.execute('balance.unconfirmed', [env.bob.name]);
        console.log(`  Bob: ${ret.result}}`);
    });

    it('1对多转账', async () => {
        console.log(`Alice采用1对多形式，向${env.bob.address[1]} ${env.bob.address[2]}发起转账操作`);
        let ret = await remote.execute('tx.create', [
            {
                'sendnow':true, 
                in:[env.alice.utxo[1], ]
            },
            [{address: env.bob.address[1], value: 5000000}, {address: env.bob.address[2], value: 5000000}, ]
        ]);
        assert(!ret.error);
    });

    it('查询账户余额', async () => {
        console.log('查询账户余额');
        let ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        console.log(`  Alice: ${ret.result}}`);
        ret = await remote.execute('balance.unconfirmed', [env.bob.name]);
        console.log(`  Bob: ${ret.result}}`);
    });

    it('多对多转账', async () => {
        console.log(`Alice采用多对多形式，向${env.bob.address[3]} ${env.bob.address[4]}发起转账操作`);
        let ret = await remote.execute('tx.create', [
            {
                'sendnow':true, 
                in:[env.alice.utxo[2], env.alice.utxo[3], env.alice.utxo[4], ]
            },
            [{address: env.bob.address[3], value: 20000000}, {address: env.bob.address[4], value: 20000000}, ]
        ]);
        assert(!ret.error);
    });

    it('查询账户余额', async () => {
        console.log('查询账户余额:');
        let ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        console.log(`  Alice: ${ret.result}`);
        ret = await remote.execute('balance.unconfirmed', [env.bob.name]);
        console.log(`  Bob: ${ret.result}`);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });

    it('查询账户交易流水', async () => {
        console.log('查询Alice账户交易流水:');
        let ret = await remote.execute('tx.last', [env.alice.name]);
        for(let item of ret.result) {
            console.log({
                hash: item.hash,
                fee: item.fee,
                inputs: item.inputs.map(it => { return {value:it.value, address:it.address}}),
                outputs: item.outputs.map(it => { return {value:it.value, address:it.address}}),
            });
        }
    });
});
