/**
 * 联机单元测试：SDK支持方案
 * @description
    验证应用层集成SDK与区块链交互的能力
    1.披露SDK支持语言：目前支持 Javascript SDK
    2.依披露，使用相关SDK，发起交易
    
    预期结果：演示与披露内容一致，交易成功
 */

const assert = require('assert');
const uuid = require('uuid/v1');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

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
}

describe('SDK支持方案', () => {
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

    it('发起交易前', async () => {
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        console.log(`账户${env.alice.name}余额:`, ret.result);
    });

    it('发起交易', async () => {
        let ret = await remote.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1500);
    });

    it('发起交易后', async () => {
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        console.log(`账户${env.alice.name}余额:`, ret.result);
    });
});
