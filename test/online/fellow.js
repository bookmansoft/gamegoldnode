/**
 * 联机单元测试 ：普通节点通过竞拍矿产证，升级为超级节点
 */

const uuid = require('uuid/v1');
const assert = require('assert');

//引入工具包
const toolkit = require('gamegoldtoolkit')
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
    structured: true,
});

//在多个测试用例间传递中间结果的缓存变量
let env = {
    name:uuid(),
    pid: 'xxxxxxxx-game-gold-boss-tokenxxx0015',
}; 

describe('普通节点升级为超级节点', ()=>{
    it('准备工作', async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', []);

        //检测块高度，必要时进行挖矿以确保创世区块成熟
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            for(let i = ret.result[0].height; i < 101; i++) {
                await remote.execute('miner.generate.admin', [1]);
                await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(100);
            }
        }
    });

    it('创建一个账户，作为普通节点', async ()=>{
        //注册一个新的CP
        let ret = await remote.execute('cp.create', [env.name, 'http://127.0.0.1']);
        env.cid = ret.result.cid;

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(500); //数据上链有一定的延迟
        
        //在CP下注册用户子帐号 alice , 记录其专属地址
        env.username = uuid();
        ret = await remote.execute('token.user', [env.cid, env.username, 0, env.username]);
        env.useraddress = ret.result.data.addr;

        //为用户转账
        await remote.execute('tx.send', [env.useraddress, 500000000]);
        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000); //数据上链有一定的延迟
    });

    it('普通节点挖矿 - 失败', async ()=>{
        ret = await remote.execute('miner.generateto.admin', [1, env.useraddress]);
        assert(ret.error);
    });

    it('升级 1/2：拍卖一个道具', async () => {
        let ret = await remote.execute('prop.sale', [env.pid, 150000000]);
        assert(!ret.error);

        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
    });

    it('升级 2/2：参与竞拍', async () => {
        let ret = await remote.execute('prop.buy', [env.pid, 200000000, env.username]);
        assert(!ret.error);

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);

        ret = await remote.execute('prop.send', [env.useraddress, env.pid, env.username]);
        assert(!ret.error);

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
    });

    it('成为超级节点，挖矿成功', async ()=>{
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
});
