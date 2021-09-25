/**
 * 可信区块链功能测试
 * 检验项目：
 *  (13). 交易处理流程
 * 测试目的：
 *  验证产品交易处理流程
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    披露交易处理流程，需包含交易打包、签名、正确性验证、一致性验证、共识与扩散、持久化等阶段
 * 预期结果：
    披露信息完整
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
const MTX = remote.gamegold.mtx;
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

describe('交易处理流程', () => {
    before(async () => {
        //通过SDK，以WS协议连接节点1，订阅指定消息
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
        remote.setmode(remote.CommMode.ws, async () => {});
        remote.watch(msg => {
            //终端收到并打印交易信息
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

    it('创建一笔交易', async () => {
        //通过SDK连接节点1，生成一笔交易并签名，暂不发送
        console.log('交易打包并签名');
        let ret = await remote.execute('tx.create', [{"sendnow":false}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作成功
        assert(!ret.error);
        env.tx = ret.result;
    });

    it('发送交易', async () => {
        //通过SDK连接节点1，发送交易，对交易正确性、一致性进行验证后，中继发送到联盟链网络
        console.log('对交易进行正确性验证、一致性验证后发送到网络进行扩散');
        env.tx.outputs[0].value = 2000000;
        let ret = await remote.execute('tx.raw.send', [MTX.fromJSON(env.tx).toRaw().toString('hex')]);
        //断言操作成功
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        //通过SDK连接节点1，执行共识流程，此举将引发节点下行交易信息至终端
        console.log('节点执行共识流程，将数据打包成区块并持久化到本地库，再通过网络进行扩散');
        await remote.execute('miner.generate.admin', [1]);
        console.log('客户端收到交易下行通知, 包括一笔coinbase和一笔普通交易:');
    });
});
