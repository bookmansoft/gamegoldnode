/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const assert = require('assert')
//引入工具包
const toolkit = require('gamerpc')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'xxxxxxxx-game-gold-root-xxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
    token:  '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08', //授权节点令牌固定量，用于访问远程钱包时的认证
    structured: false,
});

//在多个测试用例间传递中间结果的缓存变量
let env = {
    name: uuid(),
}; 
let oid = uuid();

describe('道具管理流程', () => {
    //#region 开启长连模式
    before(async ()=>{
        remote.setmode(remote.CommMode.ws);
        remote.watchNotify(async ()=>{
            await remote.login();
            await remote.join();
        }, 'onConnect');

        //监听消息，注意这几个消息都是默认下发的，不需要事先订阅
        remote.watch(msg => {
            console.log('tx.client', msg);
        }, 'tx.client').watch(msg => {
            console.log('balance.account.client', msg);
        }, 'balance.account.client').watch(msg => {
            console.log('balance.client', msg);
        }, 'balance.client');
    });
    //#endregion

    it('注册CP', async () => {
        await remote.execute('miner.setsync.admin', []);

        //注册一个新的CP, 指定 15% 的媒体分成
        let ret = await remote.execute('cp.create', [env.name, 'http://127.0.0.1', null, 'slg', 15]);

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        
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
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);

            await remote.execute('prop.found', [env.pid]);
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);

            await remote.execute('miner.generate.admin', [1]);
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);

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
