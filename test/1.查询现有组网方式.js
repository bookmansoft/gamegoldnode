/**
 * 联机单元测试：组网方式
 * @description
    披露介绍
    1.披露网络拓扑结构，应包含共识节点、普通节点等所有角色
    本测试网络是由四个节点(A:root.0、B:mchain.1、C:mchain.2、D:mchain.3)组成的对等网络，
    其中A、B节点为共识节点，C、D节点为普通节点

    2.展示本测试网络的拓扑结构，标注各角色IP
    A: 共识节点(58.220.61.35(172.16.247.177):2100)，以对等网络协议连接B、C、D节点
    B：共识节点(58.220.61.36(172.16.247.178):2100)，以对等网络协议连接A、C、D节点
    C：普通节点(58.220.61.37(172.16.247.179):2100)，以对等网络协议连接A、B、D节点
    D：普通节点(58.220.61.38(172.16.247.180):2100)，以对等网络协议连接A、B、C节点

    测试思路
    针对本项的测试流程，如何设计测试步骤（简要描述）
    1. 依次连接各节点, 查询并获取该节点当前网络拓扑信息(sys.peerinfo)
    2. 确定各节点网络拓扑信息与披露信息一致
 */

const assert = require('assert')
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

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
const remoteC = connector({
    structured: true,
    ip: notes[2].ip,        //RPC地址
    port: notes[2].rpc,    //RPC端口
});
const remoteD = connector({
    structured: true,
    ip: notes[3].ip,        //RPC地址
    port: notes[3].rpc,    //RPC端口
});
  
describe('组网方式', () => {
    before(async () => {
        await remoteA.execute('miner.setsync.admin', [true]);
        let ret = await remoteA.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remoteA.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
    });

    /** 连接节点, 查询并获取该节点当前网络拓扑信息, 预期结果：
        1.成功连接共识节点
        2.获取并打印节点网络拓扑信息, 与披露信息一致
     */
    it(`连接节点${notes[0].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        let ret = await remoteA.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[0].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
    it(`连接节点${notes[1].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        let ret = await remoteB.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[1].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
    it(`连接节点${notes[2].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        let ret = await remoteC.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[2].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
    it(`连接节点${notes[3].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        let ret = await remoteD.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[3].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
});
