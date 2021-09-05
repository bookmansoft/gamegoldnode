/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const remote = (require('./connector'))();

//在多个测试用例间传递中间结果的缓存变量
let env = {
    name: "prop-"+ uuid().slice(0,31),
}; 
let oid = "prop-oid-"+uuid().slice(0,27);

describe.skip('道具管理流程', () => {
    //#region 开启长连模式
    before(async ()=>{
        remote.setmode(remote.CommMode.ws, async () => { });

        //监听消息，注意这几个消息都是默认下发的，不需要事先订阅
        remote.watch(msg => {
            console.log('tx.client', msg);
        }, 'tx.client').watch(msg => {
            console.log('balance.client', msg);
        }, 'balance.client');
    });
    //#endregion

    it('注册CP', async () => {
        await remote.execute('miner.setsync.admin', []);

        //注册一个新的CP, 指定 15% 的媒体分成
        let ret = await remote.execute('cp.create', [env.name, '127.0.0.1,,slg,15']);

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);

        //查询并打印CP信息
        ret = await remote.execute('cp.byName', [env.name]);
        env.cid = ret.cid;
        env.addr = ret.current.address;
        console.log(env);
    });

    it('创建一个道具', async ()=>{
        if(env.cid) {
            let ret = await remote.execute('prop.create', [env.cid, oid, 10000]);
            if(!!ret) {
                env.hash = ret.hash;
                env.pid = ret.pid;
            }
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
            console.log(env);
        } else {
            console.log('缺乏厂商信息，无法生成道具');
        }
    });

    it('转移一个道具, 显示成功转移后的道具信息', async ()=> {
        if(env.pid) {
            //订阅并监听消息，该消息不是默认下发，需要事先订阅
            await remote.watch(msg => {
                console.log('push msg:', msg);
            }, 'prop/receive')
            .execute('subscribe', ['prop/receive']);

            let ret = await remote.execute('prop.send', [env.addr, env.pid]);
            if(!!ret) {
                env.hash = ret.hash;
            }
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
        } else {
            console.log('缺乏原始道具信息，无法转移道具');
        }
    });

    it('熔铸一个道具', async () => {
        if(env.pid) {
            await remote.execute('miner.generate.admin', [1]);
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);

            await remote.execute('prop.found', [env.pid]);
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);

            await remote.execute('miner.generate.admin', [1]);
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);

            let ret = await remote.execute('prop.query', [[['oid', oid]]]);
            let count = 0;
            for(let item of ret.list) {
                if(item.pst != 4) {
                    count++;
                    console.log(item);
                }
            }
            console.log('count:', count);
        } else {
            console.log('缺乏原始道具信息，无法熔铸道具');
        }
    });
});
