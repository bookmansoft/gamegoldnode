/**
 * 联机单元测试：动态新增节点证书
 * @description
    验证系统能动态新增节点证书，具备完善的证书管理体系
    1.申请加入一个节点、并颁发证书
    2.加入节点发送交易

    操作流程：
    1.在节点1上执行新增节点指令
    2.可以监测到，在节点1系统目录下生成了对应的节点证书文件
    
    预期结果：节点动态加入成功
 */

const assert = require('assert')
const connector = require('../lib/remote/connector')
const uuid = require('uuid/v1')
const {notes} = require('../lib/remote/common')

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

describe('动态新增节点证书', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
    });

    after(()=>{
        remote.close();
    });

    it(`系统管理员为节点${notes[1].name}颁发证书`, async () => {
        let ret = await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].ip}${notes[1].tcp}`]);
        assert(!ret.error);
        await remote.wait(1000);

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.wait(1000);
        await remote.execute('miner.generate.admin', [1]);
    });

    it(`监测节点${notes[1].name}，当该节点上线时发送一笔交易`, async () => {
        timers.push(setInterval(async ()=>{
            let ret = await remote.execute('sys.peerinfo', []);
            for(let item of ret) {
                if(!!item && item.subver) {
                    //监测到指定节点上线
                    if(item.subver.indexOf('/mchain.1') != -1 && !!item.inbound) {
                        timers.map(t => {
                            clearInterval(t);
                        });

                        console.log(`节点${notes[1].name}已经上线`);
                        remote.wait(2000);

                        let ret = await remote1.execute('balance.unconfirmed', [env.alice.name]);
                        assert(!ret.error);
                        console.log(`发送交易前: ${env.alice.name} 的账户余额: ${ret}`);
                
                        console.log(`发送交易中: 向${env.alice.name}发起一笔转账`);
                        ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
                        assert(!ret.error);
                        await remote1.wait(1000);
                
                        ret = await remote1.execute('balance.unconfirmed', [env.alice.name]);
                        assert(!ret.error);
                        console.log(`发送交易后: ${env.alice.name} 的账户余额: ${ret}`);

                        break;
                    }
                }
            }
        }, 3000));
    });
});
