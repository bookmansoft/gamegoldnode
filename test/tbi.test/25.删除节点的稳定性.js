/**
 * 可信区块链功能测试
 * 检验项目：
 *  (25). 删除节点的稳定性
 * 测试目的：
 *  验证产品具备在删除节点下确保应用层业务可用的能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.请求应用层服务
    2.已加入集群的节点进行删除节点的操作
    3.在删除节点过程中，持续请求应用层服务
 * 预期结果：
    1.应用层服务可用
    2.被删节点被移除出集群，并无法与集群中的节点进行共识
    3.在删除节点过程中，应用层服务可用
 */

//#region 引入SDK
const assert = require('assert')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const uuid = require('uuid/v1')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

const remote1 = connector({
    ip: notes[1].ip,        //RPC地址
    port: notes[1].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice : {name: uuid(), },
    n1: { },
    n2: { },
};
//#endregion

describe('删除节点的稳定性', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    after(() => {
        remote.close();
        remote1.close();
    });

    it('节点间同步状态判定', async () => {
        //在删除节点2之前，连接节点1和节点2，读取并打印其区块高度，显示两者处于同步状态
        for(let i = 0; i < 3; i ++) {
            let ret = await remote.execute('block.count', []);
            env.n1.height = ret;
    
            ret = await remote1.execute('block.count', []);
            env.n2.height = ret;
    
            console.log(`比较区块高度(节点间保持同步):`);
            console.log(`  ${notes[0].name}/${env.n1.height}`);
            console.log(`  ${notes[1].name}/${env.n2.height}`);

            console.log(`执行共识流程，增加区块高度`);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
        }
    });

    it('系统管理员吊销节点2证书', async () => {
        //连接节点1，系统管理员发起指令调用，吊销节点2证书
        console.log(`吊销节点${notes[1].name}的证书, 节点间将无法同步区块`);
        await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        await remote.wait(10000);
    });

    it('节点1为Alice账户持续转账', async () => {
        //连接节点1，准备演示账户及地址
        await remote.execute('account.create', [{name: env.alice.name}]);
        let ret = await remote.execute('address.receive', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret;

        //连接节点1，持续发起交易，显示在整个过程中，应用层稳定可用
        for(let i = 0; i < 5; i++) {
            console.log(`转账: ${env.alice.name} `);
            await remote.execute('tx.send', [env.alice.address, 1000000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
    
            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            console.log(`查询账户余额: ${env.alice.name} / ${ret}`);
    
            //连接节点1和节点2，查询各自区块高度，显示两者不再同步
            ret = await remote.execute('block.count', []);
            env.n1.height = ret;
    
            ret = await remote1.execute('block.count', []);
            env.n2.height = ret;
    
            if(env.n1.height != env.n2.height) {
                console.log(`比较区块高度(节点间无法同步):`);
                console.log(`  ${notes[0].name}/${env.n1.height}`);
                console.log(`  ${notes[1].name}/${env.n2.height}`);
            }
        }

        let recy = true, count = 0;
        while(recy && count++ < 10) {
            await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
            await remote.wait(2000);
            await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
            await remote.wait(2000);

            let ret = await remote.execute('sys.peerinfo', []);
            assert(!ret.error);

            for(let item of ret) {
                if(item && item.subver && item.subver.indexOf(notes[1].name) != -1 && !!item.inbound) {
                    recy = false;
                    await remote.wait(5000);
                    break;
                }
            }
        }
    });
});
