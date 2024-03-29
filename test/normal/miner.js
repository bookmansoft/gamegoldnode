/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const assert = require('assert')
const remote = (require('../lib/remote/connector'))({structured: true});

//CP
let cp = {
    name: "miner-cp-"+ uuid().slice(0,27),
    id: '',
};

//alice
let alice = {
    name: 'miner-alice'+ uuid().slice(0,25),
    addr: '',
};

let bossCid = 'xxxxxxxx-vallnet-boss-xxxxxxxxxxxxxx';
let bossOid = 'xxxxxxxx-vallnet-boss-tokenxxxxx0000';
//记录当前测试使用的矿产证
let minerToken ={
    pid: '',
    address: '',
    has: false,     //如果不存在token,后续的测试也就无法进行了.
};

describe.skip('矿产证管理', () => {
    it('查询矿产证列表', async () => {
        //查询本地节点矿产证列表
        let ret = await remote.execute('prop.query', [[['oid', bossOid]]]);
        
        assert(!ret.error);
        // 如果存在多于一个的矿产证,则取第一个登记在minerToken名下.
        if(ret.result.list.length > 0 && ret.result.list[0].cid == bossCid){
            minerToken.pid = ret.result.list[0].pid;
            minerToken.address = ret.result.list[0].current.address;
            minerToken.has = true;

            console.log(minerToken);
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

    it('建立账户', async () => {
        if(!minerToken.has)
            return; 

        //注册一个新的CP
        let ret = await remote.execute('cp.create', [cp.name, 'http://127.0.0.1']);        

        await remote.execute('miner.generate.admin', [1]);
        //等待上块成功
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(3000);
        //查询并打印CP信息
        ret = await remote.execute('cp.byName', [cp.name]);
        cp.id = ret.result.cid;

        //在该CP下注册用户子帐号, 记录其专属地址
        ret = await remote.execute('cp.user', [cp.id, alice.name, alice.name]);
        alice.cid = cp.id;
        alice.addr = ret.result.data.addr;

        //为用户转账
        await remote.execute('tx.send', [alice.addr, 500000000]);

        console.log(alice);
    });

    it('Alice挖矿失败', async () => {
        if(!minerToken.has)
            return; 
        
        let ret = await remote.execute('miner.generateto.admin', [1, alice.addr]);
        assert(!!ret.error);
        console.log(ret.error.message);
    });

    it('向Alice转让矿产证', async () => {
        if(!minerToken.has)
            return; 

        //转让矿产证
        await remote.execute('prop.send', [alice.addr, minerToken.pid]);
        
        //增加确认数
        let ret = await remote.execute('miner.generate.admin', [1]);
        assert(!ret.error);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
    });

    it('Alice挖矿成功', async () => {
        if(!minerToken.has)
            return; 

        let ret = await remote.execute('miner.generateto.admin', [1, alice.addr]);
        assert(!ret.error);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
    });

    it('验证Alice名下的矿产证', async () => {
        if(!minerToken.has)
            return; 

        let ret = await remote.execute('prop.query', [[['oid', bossOid], ['account', alice.name]]]);
        assert(!!ret.result && ret.result.list[0].pid === minerToken.pid);        
    });

    it('向默认账号归还矿产证', async () => {
        if(!minerToken.has)
           return;       

        //增加确认数
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);

        //转让矿产证
        let ret = await remote.execute('prop.send', [minerToken.address, minerToken.pid, alice.name]);
        assert(!ret.error);
        //归还保证金
        ret = await remote.execute('tx.send', [minerToken.address, 480000000, alice.name]);
        assert(!ret.error);

        //增加确认数
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
    });
});
