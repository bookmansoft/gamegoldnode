/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')

//引入工具包
const assert = require('assert')
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

//bob
let bob = {
    name: 'bob',
    addr: '',
};

let curHeight = 0;

describe('锁仓交易', () => {
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

            ret = await remote.execute('block.tips', []);
        }

        //记录当前高度
        curHeight = ret.result[0].height;
    });

    it('为Alice和Bob分配账号地址', async () => {
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

        ret = await remote.execute('token.user', [cp.id, bob.name, null, bob.name]);
        bob.cid = cp.id;
        bob.addr = ret.result.data.addr;

        //为Alice转账
        await remote.execute('tx.send', [alice.addr, 500000000]);
    });

    it('Alice锁仓转账给Bob', async () => {
        //Alice锁仓转账给Bob，指定生效高度为当前高度+2
        await remote.execute('tx.send', [bob.addr, 20000, alice.name, 'tm', curHeight + 2]);
    });

    it('Bob转账给Alice，操作因为锁仓失败', async () => {
        //Bob账户名下只有一笔Alice锁仓转账的UTXO，在当前高度下是无法使用的，因此会归于失败
        let ret = await remote.execute('tx.send', [alice.addr, 10000, bob.name]);
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('在块高度提升后，Bob转账给Alice，操作成功', async () => {
        //提升3个块高度
        await remote.execute('miner.generate.admin', [3]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1000);

        //Bob从自己的账户向Alice再次转账，此时由于条件成熟，操作应该成功
        let ret = await remote.execute('tx.send', [alice.addr, 10000, bob.name]);
        assert(!ret.error);
    });
});