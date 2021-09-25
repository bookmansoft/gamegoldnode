/**
 * 可信区块链功能测试
 * 检验项目：
 *  (2). 通信机制
 * 测试目的：
 *  验证系统的通信机制
 *  1.展示通信机制，传输协议类型
 *      节点间通过TCP协议相互连接，客户端与服务端采用HTTP或WS协议连接
 *  2.节点间通信机制
 *      节点间通过TCP协议相互连接组成对等网络，通过自定义报文进行通信
 *      节点最初只能连接由配置表指定的那些目标节点，并且只能和有限节点建立直接连接，上限由配置阀值决定
 *      节点会对每个连接进行质量评分，将适宜的连接信息在对等网络中进行广播，从而帮助整个网络构建起稳固的通信能力
 *  3.客户端与服务端通信机制
 *      客户端与服务端采用HTTP协议通信，通过自定义报文进行通信
 *      客户端与服务端也可以切换为采用WS协议通信，以获取实时消息订阅能力
 *  4.是否使用安全传输协议、数据传输压缩编码方案
 *      节点间通信采用全链路chacha20流加密技术
 *      客户端与服务端采用HMAC进行密钥分发，对敏感字段做对称加密处理，结合报文签名机制防篡改
 *      没有使用数据传输压缩编码方案
 * 前置条件：
 *  确保1、2号节点稳定运行
 * 测试流程：
 *  1. 连接节点1，打印网络拓扑
 *  2. 终端使用WS协议连接并监控节点2的下行消息
 *  3. 终端使用HTTP协议连接节点1并发起交易指令，之后节点1将交易信息发送给节点2，节点2将交易信息推送给终端
 *  4. 终端收到节点2的消息消息
 * 预期结果：
 *  1. 展示成功，与披露项一致
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
const remoteB = connector({
    structured: true,
    ip: notes[1].ip,        //RPC地址
    port: notes[1].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {};
//#endregion

describe('通信机制', () => {
    after(()=>{
        remoteB.close();
    });

    it('A节点采用TCP协议和B节点相互连接', async () => {
        //通过SDK连接节点1，查询并打印网络拓扑
        let ret = await remoteA.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`A节点的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });

    it('客户端采用WS协议连接B节点，发送指令设立Alice账户', async () => {
        //通过SDK，采用WS协议连接节点2，监控其下行消息
        remoteB.setmode(remoteB.CommMode.ws, async () => {});
        remoteB.watch(msg => {
            //终端收到并打印节点2下行消息
            console.log('B节点下发消息(type=tx.client)，客户端收到并打印', {
                hash: msg.hash,
                height: msg.height,
                block: msg.block,
                date: msg.date,
            });
        }, 'tx.client');
        //@note setmode 仅仅是设置连接方式，设置后必须调用 execute 后才能真正建立长连接，也才能成功接收推送消息

        //通过SDK连接节点2并发起指令调用，在节点B上生成一个有效地址
        let ret = await remoteB.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
    }).timeout(10000);

    it('客户端采用HTTP连接A节点, 发送交易', async () => {
        //通过SDK连接节点1并发起指令待用，向节点B上的有效地址发送一笔转账交易
        let ret = await remoteA.execute('tx.send', [env.address, 1000000]);
        //断言交易成功
        assert(!ret.error);
        assert(remoteA.verify(ret));
    }).timeout(10000);

    it('A节点发起共识流程，数据传递给B节点并推送至客户端', async () => {
        //通过SDK连接节点1，发起共识指令。此举将触发节点1向节点2发送交易信息，进而引发节点2向终端推送消息
        await remoteA.execute('miner.generate.admin', [1]);
        await remoteA.wait(3000);
    }).timeout(10000);
});
