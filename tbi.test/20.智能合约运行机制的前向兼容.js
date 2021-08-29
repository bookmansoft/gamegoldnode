/**
 * 联机单元测试：智能合约的全生命周期管理
 * @description
    验证老版本的智能合约是否能在升级后的平台上兼容，确保应用层的稳定运转
    1.对区块链系统进行升级
    2.验证在新版本的区块链系统中，是否可以正常运转智能合约

    操作流程：
    1. 确保1号、2号节点正常运作，查询2号节点当前版本
    2. 通过1号节点执行指定合约
    3. 通过1号节点监控2号节点上线情况
    4. 关闭2号节点，手工升级后重启
    5. 监控到2号节点入网，再次查询2号节点当前版本
    6. 再次执行指定合约

    预期结果：
    手动执行系统升级后，再次执行智能合约，该操作可正常运转
 */

const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

const remote1 = connector({
    ip: notes[1].ip,        //RPC地址
    port: notes[1].port,    //RPC端口
});

let timers = [];
let env = {
    contract: {},
    alice : {name: uuid(), },
    n1: {},
    n2: {},
};

describe('智能合约的全生命周期管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('查询2号节点当前版本', async () => {
        let ret = await remote1.execute('sys.info', []);
        console.log(`节点${notes[1].name}的当前版本${ret.version}`);
        env.n2.version = ret.version;
    });

    it('查询现有智能合约', async () => {
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
        if(env.contract.address) {
            console.log(`节点${notes[1].name}执行合约${env.contract.address}`);
            let ret = await remote1.execute('sc.run', [
                `${env.contract.address},50000`,
                {ver: env.contract.ver},
            ]);
            assert(!ret.error);
    
            //将上述交易上链，触发合约执行
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);
        }
    });

    it('监控2号节点上线情况', async ()=>{
        console.log(`！！！请手工关闭节点${notes[1].name}，升级并重启！！！`);

        let _update = 0;
        timers.push(setInterval(async ()=>{
            let _find = false;

            let ret = await remote.execute('sys.peerinfo', []);
            for(let item of ret) {
                if(!!item && item.subver) {
                    if(item.subver.indexOf('/mchain.1') != -1 && !!item.inbound) {
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
                timers.map(t => {
                    clearInterval(t);
                });

                ret = await remote1.execute('sys.info', []);
                console.log(`节点${notes[1].name}已升级至版本${ret.version}`);
                env.n2.version = ret.version;

                console.log(`节点${notes[1].name}再次执行合约${env.contract.address}`);
                ret = await remote1.execute('sc.run', [
                    `${env.contract.address},50000`,
                    {ver: env.contract.ver},
                ]);
                assert(!ret.error);
        
                //将上述交易上链，触发合约执行
                await remote.execute('miner.generate.admin', [1]);
                await remote.wait(1000);
            }
        }, 2000));
    });
});
