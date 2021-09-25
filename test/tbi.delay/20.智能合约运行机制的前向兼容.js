/**
 * 可信区块链功能测试
 * 检验项目：
 *  (20). 智能合约运行机制的前向兼容
 * 测试目的：
 *  验证老版本的智能合约是否能在升级后的平台上兼容，确保应用层的稳定运转
 * 前置条件：
 *  1. 确保1号、2号节点正常运作
 *  3. 确保2号节点拥有足够的燃料值
 * 测试流程：
 *  1. 通过2号节点执行指定合约
 *  2. 通过1号节点监控2号节点上线情况
 *  3. 关闭2号节点，手工升级后重启
 *  4. 监控到2号节点入网，再次查询2号节点当前版本
 *  5. 再次通过2号节点执行指定合约
 * 预期结果：
 *  手动执行系统升级后，再次执行智能合约，该操作可正常运转
 */

//#region 引入SDK
const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
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
    contract: {},
    alice : {name: uuid(), },
    n1: {},
    n2: {},
};
//#endregion

describe('智能合约运行机制的前向兼容', () => {
    before(async () => {
        //执行前期准备工作，确保2号节点拥有足够的燃料值
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('查询2号节点当前版本', async () => {
        //通过SDK连接2号节点并发起调用，查询2号节点当前版本
        let ret = await remote1.execute('sys.info', []);
        //打印查询结果
        console.log(`节点${notes[1].name}的当前版本${ret.version}`);
        env.n2.version = ret.version;
    });

    it('查询现有智能合约', async () => {
        //通过SDK连接1号节点并发起调用，查询合约实例库，选定要调用的合约
        let ret = await remote.execute('sc.query', [[['options.type','example']]]);
        for(let it of ret.list) {
            if(it.options.state == 1) {
                env.contract.address = it.options.dst;
                env.contract.ver = it.options.ver;
                console.log(`选定合约地址: ${it.options.dst} 版本: ${it.options.ver}`);
                break;
            }
        }
    });

    it('2号节点执行智能合约：成功', async () => {
        //通过SDK连接2号节点并发起调用，执行指定合约
        if(env.contract.address) {
            console.log(`节点${notes[1].name}执行合约${env.contract.address}`);
            let ret = await remote1.execute('sc.run', [
                `${env.contract.address},50000`,
                {ver: env.contract.ver},
            ]);
            //断言合约执行成功
            assert(!ret.error);
    
            //将上述交易上链
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);
        }
    });

    it('监控2号节点上线情况', async ()=>{
        //提示操作员手动关闭2号节点、升级并重启
        console.log(`！！！请手工关闭节点${notes[1].name}，升级并重启！！！`);

        let _update = 0;
        //通过1号节点监控2号节点重新上线事件
        timers.push(setInterval(async ()=>{
            let _find = false;

            let ret = await remote.execute('sys.peerinfo', []);
            for(let item of ret) {
                if(!!item && item.subver) {
                    if(item.subver.indexOf(notes[1].name) != -1 && !!item.inbound) {
                        _find = true;

                        //首次监测到指定节点在线
                        await remote.wait(1000);
                        if(_update == 0) {
                            _update = 1;
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

            if(_update == 3) {
                //1号节点监测到2号节点重新上线
                timers.map(t => {
                    clearInterval(t);
                });

                //通过SDK连接2号节点，查询并打印其当前版本
                ret = await remote1.execute('sys.info', []);
                console.log(`节点${notes[1].name}已升级至版本${ret.version}`);
                env.n2.version = ret.version;

                //通过SDK连接2号节点，再次执行前述合约
                console.log(`节点${notes[1].name}再次执行合约${env.contract.address}`);
                ret = await remote1.execute('sc.run', [
                    `${env.contract.address},50000`,
                    {ver: env.contract.ver},
                ]);
                //断言合约执行成功
                assert(!ret.error);
        
                //将上述交易上链
                await remote.execute('miner.generate.admin', [1]);
                await remote.wait(1000);
            }
        }, 2000));
    });
});
