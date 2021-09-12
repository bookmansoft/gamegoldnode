/**
 * 联机单元测试：事件机制
 * @description
    验证系统是否支持事件推送机制
    1.披露系统所支持的事件类型，如区块事件，合约事件，系统事件等
    2.订阅相关事件；
    3.触发事件，如新增区块、调用合约、制造系统异常等；
    4.查看订阅结果
    
    预期结果：订阅者能及时收到对应的订阅消息
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

let env = {};

describe('事件机制', () => {
    after(()=>{
        remoteA.close();
    });

    it('客户端采用WS协议连接A节点，发送指令设立Alice账户', async () => {
        //设置长连模式，并订阅指定消息
        remoteA.setmode(remoteA.CommMode.ws, async () => {});
        remoteA.watch(msg => {
            //收到并打印指定消息
            console.log('B节点下发消息(type=tx.client)，客户端收到并打印', {
                hash: msg.hash,
                height: msg.height,
                block: msg.block,
                date: msg.date,
            });
        }, 'tx.client');
        //@note setmode 仅仅是设置连接方式，设置后必须调用 execute 后才能真正建立长连接，也才能成功接收推送消息

        //在节点B上生成一个有效地址
        let ret = await remoteA.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
    }).timeout(10000);

    it('客户端连接A节点, 发送交易', async () => {
        //以节点B上的有效地址为接收地址，发送一笔交易
        let ret = await remoteA.execute('tx.send', [env.address, 1000000]);
        assert(!ret.error);
        assert(remoteA.verify(ret));
    }).timeout(10000);

    it('A节点发起共识流程，引发下行消息推送至客户端', async () => {
        //出块以确保交易上链
        await remoteA.execute('miner.generate.admin', [1]);
        await remoteA.wait(3000);
    }).timeout(10000);
});