/**
 * 联机单元测试：区块结构
 * @description
    验证系统存储的区块结构
    1.披露区块数据结构，包括区块头、区块内容、交易结构等
    2.抓包或Log打印实际区块结果演示验证
 */

const assert = require('assert')
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

let env = {};

describe('区块结构', () => {
    before(async () => {
        //设置长连模式，并订阅指定消息
        remoteA.setmode(remoteA.CommMode.ws, async () => {});
        remoteA.watch(async msg => {
            //收到并打印指定消息
            let block = remoteA.gamegold.chainentry.fromRaw(msg);
            let rt = await remoteA.execute('block.info', [remoteA.revHex(block.hash)]);
            console.log(`客户端收到订阅消息(type=block)`, rt.result);

            rt = await remoteA.execute('tx.get', [rt.result.tx[1]]);
            console.log(`查询交易信息`, rt.result);

        }, 'chain.connect');
        //@note setmode 仅仅是设置连接方式，设置后必须调用 execute 后才能真正建立长连接，也才能成功接收推送消息

        //通过RPC调用，订阅'chain'频道消息
        await remoteA.execute('chain.watch', []);
    });

    after(()=>{
        remoteA.close();
    });

    it('连接A节点, 发送交易', async () => {
        //生成一个有效地址
        let ret = await remoteA.execute('address.create', []);
        assert(!ret.error);

        env.address = ret.result.address;

        console.log(`向地址${env.address}转账`);
        //以该有效地址为接收地址，发送一笔交易
        ret = await remoteA.execute('tx.send', [env.address, 1000000]);
        assert(!ret.error);
    });

    it('发起共识流程', async () => {
        //出块以确保交易上链
        console.log(`A节点发起共识流程，引发下行消息`);
        await remoteA.execute('miner.generate.admin', [1]);
        await remoteA.wait(3000);
    });
});
