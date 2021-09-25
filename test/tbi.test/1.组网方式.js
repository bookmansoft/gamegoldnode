/**
 * 可信区块链功能测试
 * 检验项目：
 *  (1). 组网方式
 * 测试目的：
 *  验证系统的组网方式
 *  1.披露网络拓扑结构，应包含共识节点、普通节点等所有角色
 *      本测试网络是由四个节点(1:root.0、2:mchain.1、3:mchain.2、4:mchain.3)组成的对等网络
 *      其中1、2节点为共识节点，3、4节点为普通节点
 *  2.展示本测试网络的拓扑结构，标注各角色IP
 *      1: 共识节点(58.220.61.35(172.16.247.177):2100)，以对等网络协议连接2、3、4节点
 *      2：共识节点(58.220.61.36(172.16.247.178):2100)，以对等网络协议连接1、3、4节点
 *      3：普通节点(58.220.61.37(172.16.247.179):2100)，以对等网络协议连接1、2、4节点
 *      4：普通节点(58.220.61.38(172.16.247.180):2100)，以对等网络协议连接1、2、3节点
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
 *  1. 依次连接各节点, 查询并获取该节点当前网络拓扑信息
 * 预期结果：
 *  1.成功连接共识节点
 *  2.获取并打印节点网络拓扑信息, 与披露信息一致
 */

//#region 引入SDK
const assert = require('assert')
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
//#endregion

describe('组网方式', () => {
    before(async () => {
        await remoteA.execute('miner.setsync.admin', [true]);
        let ret = await remoteA.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remoteA.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }

        //通过SDK连接节点1，为各节点创建证书，设定拓扑方式，手工拷贝生成的证书至节点主目录
        await remoteA.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remoteA.wait(3000);
        await remoteA.execute('sys.aliance.create', ['bookmansoft', notes[2].id, notes[2].aliance, `${notes[2].inner}:${notes[2].tcp}`]);
        await remoteA.wait(3000);
        await remoteA.execute('sys.aliance.create', ['bookmansoft', notes[3].id, notes[3].aliance, `${notes[3].inner}:${notes[3].tcp}`]);
        await remoteA.wait(3000);

        //通过SDK连接节点1，为各节点补充燃料值，同时刷新网络拓扑
        await remoteA.execute('sys.aliance.refresh', [500000000]);
        await remoteA.wait(3000);

        //通过SDK连接节点1，发起共识流程，使得上述交易生效
        await remoteA.execute('miner.generate.admin', [1]);
        await remoteA.wait(1000);
    });

    it(`连接节点${notes[0].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        //通过SDK连接节点1，查询并获取该节点当前网络拓扑信息
        let ret = await remoteA.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[0].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
    it(`连接节点${notes[1].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        //通过SDK连接节点2，查询并获取该节点当前网络拓扑信息
        let ret = await remoteB.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[1].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
    it(`连接节点${notes[2].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        //通过SDK连接节点3，查询并获取该节点当前网络拓扑信息
        let ret = await remoteC.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[2].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
    it(`连接节点${notes[3].name}, 查询并获取该节点当前网络拓扑信息`, async () => {
        //通过SDK连接节点4，查询并获取该节点当前网络拓扑信息
        let ret = await remoteD.execute('sys.peerinfo', [true]);
        assert(!ret.error);

        console.log(`共识节点${notes[3].name}的网络拓扑结构:`);
        for(let it of ret.result) {
            console.log(`address: ${it.addr}, version: ${it.subver}, services: ${it.services}`);
        }
    });
});
