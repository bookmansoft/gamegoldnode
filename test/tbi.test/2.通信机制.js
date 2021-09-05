/**
 * 联机单元测试：通信机制
 * @description
    验证系统的通信机制	
    1.展示通信机制，传输协议类型
    节点间通过TCP协议相互连接，客户端与服务端采用HTTP或WS协议连接

    2.节点间通信机制
    节点间通过TCP协议相互连接组成对等网络，通过自定义报文进行通信
    节点最初只能连接由配置表指定的那些目标节点，并且只能和有限节点建立直接连接，上限由配置阀值决定
    节点会对每个连接进行质量评分，将适宜的连接信息在对等网络中进行广播，从而帮助整个网络构建起稳固的通信能力

    3.客户端与服务端通信机制
    客户端与服务端采用HTTP协议通信，通过自定义报文进行通信
    客户端与服务端也可以切换为采用WS协议通信，以获取实时消息订阅能力

    4.是否使用安全传输协议、数据传输压缩编码方案
    节点间通信采用全链路chacha20流加密技术
    客户端与服务端采用HMAC进行密钥分发，对敏感字段做对称加密处理，结合报文签名机制防篡改
    没有使用数据传输压缩编码方案
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

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

let env = {};

describe('通信机制', () => {
    after(()=>{
        remoteB.close();
    });

    it('A节点采用TCP协议和B节点相互连接', async () => {
        let ret = await remoteA.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`A节点的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });

    it('客户端采用WS协议连接B节点，发送指令设立Alice账户', async () => {
        //设置长连模式，并订阅指定消息
        remoteB.setmode(remoteB.CommMode.ws, async () => {});
        remoteB.watch(msg => {
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
        let ret = await remoteB.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
    }).timeout(10000);

    it('客户端采用HTTP连接A节点, 发送交易', async () => {
        //以节点B上的有效地址为接收地址，发送一笔交易
        let ret = await remoteA.execute('tx.send', [env.address, 1000000]);
        assert(!ret.error);
        assert(remoteA.verify(ret));
    }).timeout(10000);

    it('A节点发起共识流程，数据传递给B节点并推送至客户端', async () => {
        //出块以确保交易上链
        await remoteA.execute('miner.generate.admin', [1]);
        await remoteA.wait(3000);
    }).timeout(10000);
});
