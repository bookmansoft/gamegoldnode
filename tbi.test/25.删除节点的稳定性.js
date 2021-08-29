/**
 * 联机单元测试：删除节点的稳定性
 * @description
    验证产品具备在删除节点下确保应用层业务可用的能力
    1.请求应用层服务
    2.已加入集群的节点进行删除节点的操作
    3.在删除节点过程中，持续请求应用层服务
    
    预期结果
    1.应用层服务可用
    2.被删节点被移除出集群，并无法与集群中的节点进行共识
    3.在删除节点过程中，应用层服务可用
 */

const assert = require('assert')
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')
const uuid = require('uuid/v1')

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

const remote1 = connector({
    ip: notes[1].ip,        //RPC地址
    port: notes[1].port,    //RPC端口
});

let env = {
    alice : {name: uuid(), },
    n1: {name: 'mchain-0', },
    n2: {name: 'mchain-1', },
};

describe('删除节点的稳定性', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.wait(500);
    });

    after(() => {
        remote.close();
        remote1.close();
    });

    it('节点间同步状态判定', async () => {
        for(let i = 0; i < 3; i ++) {
            let ret = await remote.execute('block.count', []);
            env.n1.height = ret;
    
            ret = await remote1.execute('block.count', []);
            env.n2.height = ret;
    
            console.log(`比较区块高度(节点间保持同步):`);
            console.log(`  ${env.n1.name}/${env.n1.height}`);
            console.log(`  ${env.n2.name}/${env.n2.height}`);

            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
        }
    });

    it('系统管理员吊销节点2证书', async () => {
        console.log(`吊销节点${env.n2.name}的证书, 节点间将无法同步区块`);
        let ret = await remote.execute('sys.aliance.delete', [1, 'mchain']);
        assert(!ret.error);
        await remote.wait(3000);
    });

    it('节点1为Alice账户持续转账', async () => {
        await remote.execute('account.create', [{name: env.alice.name}]);
        let ret = await remote.execute('address.receive', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret;

        for(let i = 0; i < 4; i++) {
            console.log(`转账: ${env.alice.name} `);
            await remote.execute('tx.send', [env.alice.address, 1000000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(2000);
    
            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            console.log(`查询账户余额: ${env.alice.name} / ${ret}`);
    
            ret = await remote.execute('block.count', []);
            env.n1.height = ret;
    
            ret = await remote1.execute('block.count', []);
            env.n2.height = ret;
    
            console.log(`比较区块高度(节点间无法同步):`);
            console.log(`  ${env.n1.name}/${env.n1.height}`);
            console.log(`  ${env.n2.name}/${env.n2.height}`);
        }

        let recy = true;
        while(recy) {
            ret = await remote.execute('sys.aliance.create', ['bookmansoft', 1, 'mchain', '127.0.0.1:2110']);
            assert(!ret.error);
            await remote.wait(2000);

            ret = await remote.execute('sys.peerinfo', []);
            assert(!ret.error);

            for(let item of ret) {
                if(item.subver == '/vallnet:v2.6.0/mchain.1' && !!item.inbound) {
                    recy = false;
                    break;
                }
            }
        }
    });
});
