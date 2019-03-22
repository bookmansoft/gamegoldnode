/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const assert = require('assert')

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
    token:  '02c6754571e0cf8949fb71906a501ba520b8e960c7eb35cb3931e362e5d25d2bc5', //授权节点令牌固定量，用于访问远程钱包时的认证
    structured: true,
});

//CP
let cp = {
    name: uuid(),
    id: '',
};

//alice
let alice = {
    name: 'alice',
    addr: '',
};

describe('矿产证管理', () => {
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

    it('建立账户', async () => {
        //注册一个新的CP
        let ret = await remote.execute('cp.create', [cp.name, 'http://127.0.0.1']);

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        
        //查询并打印CP信息
        ret = await remote.execute('cp.byName', [cp.name]);
        cp.id = ret.result.cid;

        //在该CP下注册用户子帐号, 记录其专属地址
        ret = await remote.execute('token.user', [cp.id, alice.name, null, alice.name]);
        alice.cid = cp.id;
        alice.addr = ret.result.data.addr;

        //为用户转账
        await remote.execute('tx.send', [alice.addr, 500000000]);

        console.log(alice);
    });

    it('Alice挖矿失败', async () => {
        let ret = await remote.execute('miner.generateto.admin', [1, alice.addr]);
        assert(!!ret.error);
        console.log(ret.error.message);
    });

    it('向Alice转让矿产证', async () => {
        //查询矿产证列表
        let ret = await remote.execute('prop.remoteQuery', [[['cid', 'xxxxxxxx-game-gold-boss-xxxxxxxxxxxx']]]);

        //转让矿产证
        await remote.execute('prop.send', [alice.addr, ret.result.list[0].pid]);
        //增加确认数
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1000);
    });

    it('Alice挖矿成功', async () => {
        let ret = await remote.execute('miner.generateto.admin', [1, alice.addr]);
        assert(!ret.error);
    });

    it('验证Alice名下的矿产证', async () => {
        let ret = await remote.execute('prop.list', [1, 'alice']);
        assert(!!ret.result && ret.result.list[0].pid === 'xxxxxxxx-game-gold-boss-tokenxxx0001');
    });
});