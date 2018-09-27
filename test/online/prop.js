/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const gamegold = require('gamegold')
const util = gamegold.util
const remote = require('../../lib/consoleConn')

let env = {}; //在多个测试用例间传递中间结果的缓存变量

describe.skip('道具管理流程', () => {
    it('设定厂商和转移地址信息', async () => {
        let ret = await remote.execute('cp.list', []);
        if(!!ret && ret.length>0) {
            env.cid = ret[0].cid;
            env.addr = ret[0].current.address;
            console.log(env);
        }
        else {
            console.log('厂商列表为空');
        }
    });

    it('创建一个道具', async ()=>{
        if(env.cid) {
            let ret = await remote.execute('prop.create', [env.cid, uuid(), 20000]);
            if(!!ret) {
                env.hash = ret.hash;
            }
            await util.waiting(1000);
            console.log(env);
        }
        else{
            console.log('缺乏厂商信息，无法生成道具');
        }
    });

    it('转移一个道具, 显示成功转移后的道具信息', async ()=> {
        if(env.hash) {
            let ret = await remote.execute('prop.send', [env.addr, env.hash, 0]);
            if(!!ret) {
                env.hash = ret.hash;
            }
            await util.waiting(1000);
            await remote.execute('generate', [1]);
            await util.waiting(1000);
            ret = await remote.execute('prop.list', []);
            for(let item of ret) {
                if(item.current.rev == env.hash) {
                    env.prop = {hash: env.hash, pid: item.pid, cid: item.cid, oid: item.oid, gold: item.gold};
                }
            }
            console.log(env);
        }
        else{
            console.log('缺乏原始道具信息，无法转移道具');
        }
    });

    it('熔铸一个道具', async ()=>{
        if(env.prop) {
            await remote.execute('prop.found', [env.prop.hash]);
            await util.waiting(1000);
            await remote.execute('generate', [1]);
            await util.waiting(1000);
            console.log(await remote.execute('prop.list', []));
        }
    });
});
