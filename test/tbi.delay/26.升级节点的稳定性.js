/**
 * 可信区块链功能测试
 * 检验项目：
 *  (26). 升级节点的稳定性
 * 测试目的：
 *  验证产品具备在升级节点下确保应用层业务可用的能力
 * 前置条件：
 *  1. 确保1号、3号节点正常运作
 * 测试流程：
 *  1. 通过1号节点持续请求应用层服务
 *  2. 通过1号节点监控节点3在线状态
 *  3. 通知操作员手动停止3号节点，升级后重启，在升级节点过程中，持续请求应用层服务
 *  4. 1号节点监测到节点3上线，持续请求应用层服务，直至双方数据完成同步后退出运行
 * 预期结果：
 *  1. 应用层服务持续可用
 *  2. 节点升级成功，继续能与集群中的节点进行共识
 *  3. 在升级节点过程中，应用层服务可用
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
    ip: notes[2].ip,        //RPC地址
    port: notes[2].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let timers = [];
let env = {
    alice : {name: uuid(), },
    n1: {},
    n3: {},
};
//#endregion

describe('升级节点的稳定性', () => {
    before(async () => {
        //预先准备工作，确保相关节点正常运行
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    
        env.n1.height = 0;
        env.n1.version = '';
        env.n3.height = 0;
        env.n3.version = '';
    });

    after(() => {
        remote.close();
        remote1.close();
    });

    it(`请求应用层服务: 持续为Alice账户转账`, async () => {
        //通过SDK连接节点1，调用指令生成演示账户数据
        await remote.execute('account.create', [{name: env.alice.name}]);
        let ret = await remote.execute('address.receive', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret;

        console.log(`持续进行应用层服务调用`);

        //通过SDK连接节点1，持续发起应用层调用，同时持续监控节点3运行状态和升级进程
        let _update = 0;
        timers.push(setInterval(async ()=>{
            console.log(`转账: ${env.alice.name} `);
            await remote.execute('tx.send', [env.alice.address, 1000000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);

            let ret = await remote.execute('balance.confirmed', [env.alice.name]);
            assert(!ret.error);
            console.log(`查账: ${env.alice.name} / ${ret}`);

            let _find = false;

            ret = await remote.execute('sys.peerinfo', []);
            for(let item of ret) {
                if(!!item && item.subver) {
                    if(item.subver.indexOf(notes[2].name) != -1 && !!item.inbound) {
                        //监测到节点3在线
                        _find = true;
                        if(_update == 0) {
                            _update = 1;
                        }

                        await remote1.wait(1000);

                        //通过SDK连接节点3，查询其版本和高度信息
                        ret = await remote1.execute('block.count', []);
                        if(!ret.error) {
                            env.n3.height = ret;
                        }

                        ret = await remote1.execute('sys.info', []);
                        if(!ret.error) {
                            env.n3.version = `/vallnet:${ret.version}/${notes[2].name}`;
                        }

                        break;
                    }
                }
            }

            if(!_find) {
                if(_update == 1) {
                    _update = 2;
                }
            } else {
                if(_update == 2) {
                    _update = 3;
                }
            }

            //通过SDK连接节点1，查询其版本和高度信息
            ret = await remote.execute('block.count', []);
            env.n1.height = ret;

            ret = await remote.execute('sys.info', []);
            env.n1.version = `/vallnet:${ret.version}/${notes[0].name}`;

            //比较节点1和节点3的高度信息，断言两者重新达成一致
            console.log(`比较节点们的区块高度:`);
            console.log(`  ${env.n1.height}${env.n1.version}`);
            console.log(`  ${env.n3.height}${env.n3.version}`);

            if(_update == 3) {
                if(env.n1.height == env.n3.height) {
                    await remote.wait(5000);
                    console.log(`共识判定: ${notes[0].name}和${notes[2].name}再次达成共识`);
                    timers.map(t => {
                        clearInterval(t);
                    });
                }
            }
        }, 3000));

        //提示操作员手动关闭节点3，升级并重启
        console.log(`！！！请手工关闭节点${notes[2].name}，升级并重启！！！`);
    });
});
