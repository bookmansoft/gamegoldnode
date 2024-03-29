/**
 * 联机单元测试 ：普通节点通过竞拍矿产证，升级为超级节点
 */

const uuid = require('uuid/v1');
const assert = require('assert');
const remote = (require('../lib/remote/connector'))({structured: true});
// 超级节点Cp编号,由它发行所有的矿产证
let bossCid = 'xxxxxxxx-vallnet-boss-xxxxxxxxxxxxxx';
let bossOid = 'xxxxxxxx-vallnet-boss-tokenxxxxx0000';

//在多个测试用例间传递中间结果的缓存变量
let env = {
    name:"fellow-"+ uuid().slice(0,29),
    pid: '',
    address: '',
    has: false,     //如果不存在token,后续的测试也就无法进行了.
};   

describe.skip('普通节点升级为超级节点', ()=>{
    before(async () => {
        //查询本地节点矿产证列表
        let ret = await remote.execute('prop.query', [[['oid', bossOid]]]);
        
        assert(!ret.error);
        // 如果存在多于一个的矿产证,env.
        if(ret.result.list.length > 0 && ret.result.list[0].cid == bossCid){
            env.pid = ret.result.list[0].pid;
            env.address = ret.result.list[0].current.address;
            env.has = true;

            console.log(env);
        }
    });
    it('准备工作', async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', []);

        //检测块高度，必要时进行挖矿以确保创世区块成熟
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            for(let i = ret.result[0].height; i < 101; i++) {
                await remote.execute('miner.generate.admin', [1]);
                await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
            }
        }
    });

    it('创建一个账户，作为普通节点', async ()=>{
        if(!env.has)
            return;
        //注册一个新的CP
        let ret = await remote.execute('cp.create', [env.name, 'http://127.0.0.1']);
        env.cid = ret.result.cid;

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2500); //数据上链有一定的延迟
        
        //在CP下注册用户子帐号 alice , 记录其专属地址
        env.username = "fellow-alice-"+uuid().slice(0,23);
        ret = await remote.execute('cp.user', [env.cid, env.username, env.username]);
        env.useraddress = ret.result.data.addr;

        //为用户转账
        await remote.execute('tx.send', [env.useraddress, 500000000]);
        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000); //数据上链有一定的延迟
    });

    it('普通节点挖矿 - 失败', async ()=>{
        if(!env.has)
            return;

        ret = await remote.execute('miner.generateto.admin', [1, env.useraddress]);
        assert(ret.error);
    });

    it('普通节点地址升级为超级节点', async () => {
        if(!env.has)
            return;

        // 升级 1/2：拍卖一个道具
        let ret = await remote.execute('prop.sale', [env.pid, 150000000]);
        assert(!ret.error);

        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);
    
        // '升级 2/2：参与竞拍'
        ret = await remote.execute('prop.buy', [env.pid, 200000000, env.username]);
        assert(!ret.error);

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);
        
        //把地址转到挖矿地址
        ret = await remote.execute('prop.send', [env.useraddress, env.pid, env.username]);
        assert(!ret.error);

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);        
    });

    it.skip('成为超级节点，挖矿成功', async ()=>{
        if(!env.has)
            return;

        let ret = await remote.execute('balance.all', [env.username]);
        env.current = ret.result.confirmed;

        //第一种挖矿指令
        ret = await remote.execute('miner.generateto.admin', [1, env.useraddress]);
        assert(!ret.error);

        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(3000);//数据上链有一定的延迟

        //获取了正确的挖矿奖励
        ret = await remote.execute('balance.all', [env.username]);
        assert(ret.result.confirmed = env.current + 5000000000);
        
        //第二种挖矿指令 1/2：设置挖矿地址
        ret = await remote.execute('miner.setaddr.admin', [env.useraddress]);
        assert(!ret.error);

        //第二种挖矿指令 2/2：挖矿
        ret = await remote.execute('miner.generate.admin', [1]);
        assert(!ret.error);

        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(3000);//数据上链有一定的延迟

        //获取了正确的挖矿奖励
        ret = await remote.execute('balance.all', [env.username]);
        assert(ret.result.confirmed = env.current + 10000000000);
    });    
    
    it.skip('向主节点返还矿产证', async ()=>{
        if(!env.has)
            return;

        //向主节点返还矿产证
        let ret = await remote.execute('prop.send', [env.address, env.pid, env.username]);
        assert(!ret.error);
      
        //恢复默认挖矿地址
        ret = await remote.execute('miner.setaddr.admin', [env.address]);
        assert(!ret.error);

        //确保数据上链
        ret = await remote.execute('miner.generate.admin', [1]);
        assert(!ret.error);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(3000);//数据上链有一定的延迟
    });
});
