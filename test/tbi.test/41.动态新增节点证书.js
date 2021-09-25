/**
 * 可信区块链功能测试
 * 检验项目：
 *  (41). 动态新增节点证书
 * 测试目的：验证系统能动态新增节点证书，具备完善的证书管理体系
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.在节点1上执行删除节点2的指令，可以观测到节点2下线
    2.在节点1上执行新增节点2的指令，可以观测到节点2重新上线
    3.在节点2上执行交易，可成功执行
 * 预期结果：节点动态加入成功
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

describe('动态新增节点证书', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    after(()=>{
        remote.close();
    });

    it(`系统管理员吊销节点${notes[1].name}证书使其下线`, async () => {
        //连接节点1，系统管理员删除节点2证书，强制使其下线
        console.log(`系统管理员吊销节点${notes[1].name}证书使其下线`);
        await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        await remote.wait(8000);
    });

    it(`监测节点${notes[1].name}在线状态`, async () => {
        //连接节点1，实时监测节点2上线状态
        console.log(`监测节点${notes[1].name}在线状态`);
        timers.push(setInterval(async ()=>{
            let ret = await remote.execute('sys.peerinfo', []);
            for(let item of ret) {
                if(!!item && item.subver) {
                    //监测到指定节点上线
                    if(item.subver.indexOf(notes[1].name) != -1 && !!item.inbound) {
                        timers.map(t => {
                            clearInterval(t);
                        });
                        remote.wait(5000);
                        //监测到节点2重新上线
                        console.log(`节点${notes[1].name}已经上线`);
                        //切换连接节点2，并发起交易指令
                        console.log(`发送交易中: 向${env.alice.name}发起一笔转账`);
                        let rt = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
                        //断言操作成功
                        assert(!rt.error);
                        break;
                    }
                }
            }
        }, 6000));
    });

    it(`系统管理员为节点${notes[1].name}颁发证书`, async () => {
        //连接节点1，系统管理员为节点2颁发新的证书，节点2即将重新上线
        console.log(`系统管理员为节点${notes[1].name}颁发证书`);

        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(2000);
        console.log(`${notes[1].name}即将上线`);

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });
});
