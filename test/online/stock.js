/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
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

/* CP对象中，stock子对象的数据结构
stock: { 
  hHeight: 0,
  hSum: 0,
  hPrice: 0,
  hBonus: 0,
  hAds: 0,
  sum: 0,
  price: 0,
  height: 0 
}
*/

describe('凭证管理', () => {
    for(let i = 0; i < 10; i++) {
        //CP
        let cp = {
            name: uuid(),
            id: '',
        };

        //买家 alice
        let alice = {
            name: 'alice',
            addr: '',
        };
        //卖家 bob
        let bob = {
            name: 'bob',
            addr: '',
        };

        //消费者
        let customer = {
            name: 'p1',     //用户编号
            sn: uuid(),     //订单编号
        };

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
    
        it('一级市场发行 - CP不存在', async () => {
            let ret = await remote.execute('stock.offer', ['abc', 1000, 1000]);
            assert(!!ret.error && ret.error.message == 'CP Not Exist');
        });
    
        it('注册CP', async () => {
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
    
            //为用户转账
            await remote.execute('tx.send', [alice.addr, 500000000]);
            await remote.execute('tx.send', [bob.addr, 500000000]);
    
            await remote.execute('miner.generate.admin', [1]);
    
            //console.log(alice);
            //console.log(bob);
            //console.log(cp);
        });
    
        it('一级市场发行 - 非法账户', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 1000, alice.name]);
            assert(!!ret.error);
            assert(!!ret.error && ret.error.message == 'illegal account');
        });
    
        it('一级市场发行 - 非法数量', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1.1e+6, 1000]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('stock.offer', [cp.id, 99, 1000]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 0);
        });
    
        it('一级市场发行 - 非法金额', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 0]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('stock.offer', [cp.id, 1000, -1]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('stock.offer', [cp.id, 100, 5000001]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 0);
        });
    
        it('一级市场发行 - 成功', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 1000]);
            assert(!ret.error);
    
            await remote.execute('miner.generate.admin', [1]);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 1000);
            assert(ret.result.stock.price === 1000);
        });
    
        it('一级市场购买', async () => {
            //Alice 购买凭证
            let ret = await remote.execute('stock.purchase', [cp.id, 500, alice.name]);
            assert(!ret.error);
    
            //查询 Alice 的凭证余额
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', alice.addr]]]);
            assert(ret.result.list[0].sum === 500);
            assert(ret.result.list[0].price === 1000);
        });
    
        it('无偿转让', async () => {
            let ret = await remote.execute('stock.send', [cp.id, 100, bob.addr, alice.name]);
    
            //查询 Alice 的凭证余额
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', alice.addr]]]);
            assert(ret.result.list[0].sum === 400);
    
            //查询 Bob 的凭证余额
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', bob.addr]]]);
            assert(ret.result.list[0].sum === 100);
        });
    
        it('二级市场拍卖', async () => {
            let ret = await remote.execute('stock.bid', [cp.id, 200, 2000, alice.name]);
            assert(!ret.error);
    
            ret = await remote.execute('stock.bid.list', [[['cid', cp.id]]]);
            assert(ret.result.list[0].addr === alice.addr);
            assert(ret.result.list[0].stock.sum === 200);
            assert(ret.result.list[0].stock.price === 2000);
        });
    
        it('二级市场购买', async () => {
            let ret = await remote.execute('stock.auction', [cp.id, alice.addr, 100, 2000, bob.name]);
            assert(!ret.error);
    
            //查询 Bob 的凭证余额
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', bob.addr]]]);
            assert(ret.result.list[0].sum === 200);
        });
    
        it('验证凭证分配的有效性', async () => {
            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);
    
            let ret = await remote.execute('stock.list', [[['cid', cp.id]]]);
            assert(ret.result.list.length == 2);
            
            for(let item of ret.result.list) {
                if(item.stock.addr == alice.addr) {
                    assert(item.stock.sum === 300);
                } else if(item.stock.addr == bob.addr) {
                    assert(item.stock.sum === 200);
                }
            }
        });
    
        it('一级市场发行 - 累计分成不足不能继续发行', async () => {
            let ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 500); 
            assert(ret.result.stock.price === 1000);
            assert(ret.result.stock.hSum === 500);
            assert(ret.result.stock.hPrice === 1000);
    
            ret = await remote.execute('stock.offer', [cp.id, 1000, 1000]);
            assert(!ret.error); //由于当前机制问题，此处不会提示错误
    
            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            //注意数值没有发生变化
            assert(ret.result.stock.sum === 500); 
            assert(ret.result.stock.price === 1000);
            assert(ret.result.stock.hSum === 500);
            assert(ret.result.stock.hPrice === 1000);
        });
    
        it('连挖20个区块，确保生成CP快照，确保交易分成顺利进行', async () => {
            //在之前的测试中，连挖10个块尚不足以确保生成CP快照，改为20个后测试恢复正常
            await remote.execute('miner.generate.admin', [20]); 
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1000);
        });
    
        it('发起一个支付交易', async () => {
            let ret = await remote.execute('order.pay', [cp.id, customer.name, customer.sn, 1000000000]);
            assert(!ret.error);
    
            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);
        });
    
        it('一级市场发行 - 冷却期内不能继续发行', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 1000]);
            assert(!ret.error); //由于当前机制问题，此处不会提示错误
    
            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            //注意数值没有发生变化
            assert(ret.result.stock.sum === 500); 
            assert(ret.result.stock.price === 1000);
            assert(ret.result.stock.hSum === 500);
            assert(ret.result.stock.hPrice === 1000);
        });
    
        it('连挖56个块，确保度过冷却期', async () => {
            await remote.execute('miner.generate.admin', [56]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1000);
        });
    
    
        it('再次发行凭证成功', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 1000]);
            assert(!ret.error);
    
            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 1000); 
            assert(ret.result.stock.price === 1000); 
            assert(ret.result.stock.hSum === 500);
        });
    }
});
