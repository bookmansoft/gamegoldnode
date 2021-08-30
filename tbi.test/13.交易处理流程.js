/**
 * 联机单元测试：交易处理流程
 * @description
    披露交易处理流程，需包含交易打包、签名、正确性验证、一致性验证、共识与扩散、持久化等阶段
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
const MTX = remote.gamegold.mtx;

let env = {
    alice: {
        name: uuid(),
        address: '',
    },
    tx: {},
}

describe('交易处理流程', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);

        //设置长连模式，并订阅指定消息
        remote.setmode(remote.CommMode.ws, async () => {});
        remote.watch(msg => {
            //收到并打印指定消息
            console.log({
                hash: msg.hash,
                height: msg.height,
                block: msg.block,
                time: msg.time,
            });
        }, 'tx.client');
    });

    after(()=>{
        remote.close();
    });

    //交易打包、签名、正确性验证、一致性验证、共识与扩散、持久化
    it('创建一笔交易', async () => {
        console.log('交易打包并签名');

        let ret = await remote.execute('tx.create', [{"sendnow":false}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
        env.tx = ret.result;
    });

    it('发送交易', async () => {
        console.log('对交易进行正确性验证、一致性验证后发送到网络进行扩散');

        env.tx.outputs[0].value = 2000000;
        let ret = await remote.execute('tx.raw.send', [MTX.fromJSON(env.tx).toRaw().toString('hex')]);
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        console.log('节点执行共识流程，将数据打包成区块并持久化到本地库，再通过网络进行扩散');

        await remote.execute('miner.generate.admin', [1]);

        console.log('客户端收到交易下行通知, 包括一笔coinbase和一笔普通交易:');
    });
});
