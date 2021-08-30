/**
 * 联机单元测试：新增节点的稳定性
 * @description
    验证产品具备在新增节点下确保应用层业务可用的能力
    1.请求应用层服务
    2.新节点部署后，发起新增节点的请求
    3.在新增节点过程中，持续请求应用层服务
    
    预期结果：
    1.应用层服务可用；
    2.新增节点加入到集群中，并能与集群中的节点进行共识
    3.在新增节点过程中，应用层服务可用

    操作流程：
    1.删除节点2证书
    2.设立Alice账户，持续转账出块并监控Alice账户余额，以及节点1区块高度
    3.开始监控节点2区块高度
    4.增加节点2证书
    5.当节点1和节点2高度一致时退出运行
 */

const assert = require('assert')
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')
const uuid = require('uuid/v1')

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

const remote1 = connector({
    ip: notes[1].ip,        //RPC地址
    port: notes[1].rpc,    //RPC端口
});

let timers = [];
let env = {
    alice : {name: uuid(), },
    n1: {},
    n2: {},
};

describe('新增节点的稳定性', () => {
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

    it('系统管理员吊销节点2证书', async () => {
        console.log(`吊销节点${notes[1].name}的证书, 节点间将无法同步区块`);
        
        await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        await remote.wait(8000);
    });

    it('节点1为Alice账户持续转账', async () => {
        await remote.execute('account.create', [{name: env.alice.name}]);
        let ret = await remote.execute('address.receive', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret;

        timers.push(setInterval(async ()=>{
            console.log(`转账: ${env.alice.name} `);
            await remote.execute('tx.send', [env.alice.address, 1000000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);

            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            console.log(`查询账户余额: ${env.alice.name} / ${ret}`);
    
            ret = await remote.execute('block.count', []);
            if(!ret.error) {
                env.n1.height = ret;
            }

            ret = await remote1.execute('block.count', []);
            if(!ret.error) {
                env.n2.height = ret;
            }

            console.log(`比较区块高度:`);
            console.log(`  ${notes[0].name}/${env.n1.height}`);
            console.log(`  ${notes[1].name}/${env.n2.height}`);

            if(env.n1.height == env.n2.height) {
                console.log(`共识判定: ${notes[0].name}和${notes[1].name}再次达成共识`);
                timers.map(t => {
                    clearInterval(t);
                });
            }
        }, 5000));

        await remote.wait(15000);
    });

    it('系统管理员再次为节点2颁发证书', async () => {
        console.log(`恢复节点${notes[1].name}的证书, 节点间开始重新同步区块`);

        let recy = true, count = 0;
        while(recy && count++ < 10) {
            let ret = await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
            assert(!ret.error);
            await remote.wait(2000);

            ret = await remote.execute('sys.peerinfo', []);
            assert(!ret.error);

            for(let item of ret) {
                if(item && item.subver && item.subver.indexOf(notes[1].name) != -1 && !!item.inbound) {
                    recy = false;
                    break;
                }
            }
        }
    });
});
