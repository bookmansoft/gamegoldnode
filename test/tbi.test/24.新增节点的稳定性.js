/**
 * 可信区块链功能测试
 * 检验项目：
 *  (24). 新增节点的稳定性
 * 测试目的：
 *  验证产品具备在新增节点下确保应用层业务可用的能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.新增节点2
    2.监控节点1和节点2区块高度
    3.持续请求应用层服务. 设立Alice账户并监控Alice账户余额，以此验证操作成功. 节点2因尚未入网，高度不会增加
    3.为节点2颁发证书，以便节点2能和节点1顺利组网，成为新增节点
    5.将测到节点2高度逐渐追上节点1，当节点1和节点2高度一致时退出运行
 * 预期结果：
    1.应用层服务可用；
    2.新增节点加入到集群中，并能与集群中的节点进行共识
    3.在新增节点过程中，应用层服务可用
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
let timers = [];
let env = {
    alice : {name: uuid(), },
    n1: {},
    n2: {},
};
//#endregion

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
        //运行节点2，于此同时系统管理员连接节点1，吊销节点2可能存在的证书，使其无法并网
        console.log(`吊销节点${notes[1].name}的证书, 节点间将无法同步区块`);
        await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        await remote.wait(10000);
    });

    it('节点1为Alice账户持续转账', async () => {
        //连接节点1，设立演示账户和地址
        await remote.execute('account.create', [{name: env.alice.name}]);
        let ret = await remote.execute('address.receive', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret;

        //连接节点1，在整个过程中，持续发送应用层请求(转账交易)
        timers.push(setInterval(async ()=>{
            console.log(`转账: ${env.alice.name} `);
            await remote.execute('tx.send', [env.alice.address, 1000000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);

            //连接节点1，查询并打印演示账户余额，可以看到账户余额在持续增长
            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            console.log(`查询账户余额: ${env.alice.name} / ${ret}`);
    
            //实时监控节点1和节点2的区块高度
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
                //当节点1和节点2高度重新恢复一致时，结束用例运行
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
        //连接节点1，系统管理员为节点2颁发新的证书，使其并网并获得数据同步能力
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
