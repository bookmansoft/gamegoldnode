/**
 * 联机单元测试：本地全节点提供运行时环境
 * @description
 * 2019.05.26 凭证分成降至20%，且参照计划发行总量而非实际发行总量计算占比
 */

/**
 * 合约检测结果码
 */
const verifyCode = {
    Failed: 0,                              //失败
    Success: 1,                             //成功
    StockOffering: 1001,                    //处于发行期，不能再次发售
    StockCooling: 1002,                     //处于冷却期，不能再次发售
    WrongPrice: 1003,                       //不当的价格
    WrongFee: 1004,                         //不当的税费
    WrongPublisher: 1005,                   //错误的发布者
    WrongSum: 1006,                         //凭证数量不合理
    WrongBonus: 1007,                       //累计奖励不足，不能再次发行
    SnapNull: 1008,                         //凭证快照不存在
    SignFailed: 1009,                       //签名错误
    WrongHeight: 1010,                      //错误的高度值
    WrongFormat: 1011,                      //错误的格式
    StockAccountNotExist: 1012,             //凭证账户不存在
    StockAccountNotEnoughSum: 1013,         //凭证账户余额不足
    StockOfferExpired: 1014,                //凭证发行已过期
    FundNotEnough: 1015,                    //资金不足
};

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
    //重复多次测试
    for(let i = 0; i < 1; i++) {
        //CP
        let cp = {
            name: uuid(),
            id: '',
        };

        //买家 alice
        let alice = {
            name: uuid(),
            addr: '',
            sn: ()=>{return uuid();},     //订单编号
        };
        //卖家 bob
        let bob = {
            name: uuid(),
            addr: '',
            sn: ()=>{return uuid();},     //订单编号
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
            let ret = await remote.execute('stock.offer', [cp.name, 1000, 1000]);
            assert(!!ret.error && ret.error.message == 'CP Not Exist');
        });
    
        it('注册CP', async () => {
            //注册一个新的CP, 指定 15% 的媒体分成
            let ret = await remote.execute('cp.create', [cp.name, 'http://127.0.0.1', null, 'slg', 15]);
    
            //确保该CP数据上链
            await remote.execute('miner.generate.admin', [1]);
            
            //查询并打印CP信息
            ret = await remote.execute('cp.byName', [cp.name]);
            cp.id = ret.result.cid;
    
            //在CP下注册用户子帐号 alice , 记录其专属地址
            ret = await remote.execute('token.user', [cp.id, alice.name, null, alice.name]);
            alice.cid = cp.id;
            alice.addr = ret.result.data.addr;
    
            //在CP下注册用户子帐号 bob, 记录其专属地址, 指定 alice 为其推荐者
            ret = await remote.execute('token.user', [cp.id, bob.name, alice.addr, bob.name]);
            bob.cid = cp.id;
            bob.addr = ret.result.data.addr;
        });
    
        it('一级市场发行 - 非法账户', async () => {
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 1000, alice.name]);
            assert(!!ret.error);
        });
    
        it('一级市场发行 - 非法数量', async () => {
            //数量太多
            let ret = await remote.execute('stock.offer', [cp.id, 1.1e+6, 1000]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            //数量太少
            ret = await remote.execute('stock.offer', [cp.id, 99, 1000]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 0);
        });
    
        it('一级市场发行 - 非法金额', async () => {
            //金额必须大于0
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 0]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            //金额必须大于0
            ret = await remote.execute('stock.offer', [cp.id, 1000, -1]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            //金额不能大于 5000000
            ret = await remote.execute('stock.offer', [cp.id, 100, 5000001]);
            assert(!!ret.error);
            //console.log(ret.error.message);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 0);
        });
    
        it('一级市场发行 - 成功', async () => {
            //数量、价格符合标准，还要能够支付 5% 发行总额的手续费
            let ret = await remote.execute('stock.offer', [cp.id, 1000, 1000]);
            assert(!ret.error);
    
            await remote.execute('miner.generate.admin', [1]);
    
            ret = await remote.execute('cp.byId', [cp.id]);
            assert(ret.result.stock.sum === 1000);
            assert(ret.result.stock.price === 1000);
        });
    
        it('一级市场购买', async () => {
            //Alice 购买凭证, 余额不足，失败
            let ret = await remote.execute('stock.purchase', [cp.id, 500, alice.name]);
            assert(!!ret.error);

            //为用户转账
            await remote.execute('tx.send', [alice.addr, 5000000000]);

            //Alice 购买 500 凭证
            ret = await remote.execute('stock.purchase', [cp.id, 500, alice.name]);
            assert(!ret.error);

            //查询 Alice 的凭证余额 === 500
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', alice.addr]]]);
            assert(ret.result.list[0].sum === 500);
            assert(ret.result.list[0].price === 1000);

            //Alice 购买超过剩余总量的凭证，接口上没有报错，但操作最终失败了
            ret = await remote.execute('stock.purchase', [cp.id, 600, alice.name]);

            //查询 Alice 的凭证余额 === 500
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', alice.addr]]]);
            assert(ret.result.list[0].sum === 500);
            assert(ret.result.list[0].price === 1000);
        });
    
        it('无偿转让', async () => {
            //转账总额超过凭证余额
            let ret = await remote.execute('stock.send', [cp.id, 600, bob.addr, alice.name]);

            //查询 Bob 的凭证余额，没有发生变化
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', bob.addr]]]);
            assert(ret.result.list.length === 0);

            //alice 转给 bob 100
            ret = await remote.execute('stock.send', [cp.id, 100, bob.addr, alice.name]);
            assert(!ret.error);
    
            //查询 Alice 的凭证余额 === 400
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', alice.addr]]]);
            assert(ret.result.list[0].sum === 400);
    
            //查询 Bob 的凭证余额 === 100
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', bob.addr]]]);
            assert(ret.result.list[0].sum === 100);
        });
    
        it('二级市场拍卖', async () => {
            //alice 挂牌 200 凭证
            let ret = await remote.execute('stock.bid', [cp.id, 200, 2000, alice.name]);
            assert(!ret.error);
    
            ret = await remote.execute('stock.bid.list', [[['cid', cp.id]]]);
            assert(ret.result.list[0].addr === alice.addr);
            assert(ret.result.list[0].stock.sum === 200);
            assert(ret.result.list[0].stock.price === 2000);
        });
    
        it('二级市场购买', async () => {
            //Bob购买凭证，因为金额不足失败
            let ret = await remote.execute('stock.auction', [cp.id, alice.addr, 100, 2000, bob.name]);
            assert(!!ret.error);

            //查询 Bob 的凭证余额
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', bob.addr]]]);
            assert(ret.result.list[0].sum === 100);

            //向Bob转账，以使其拥有足够的资金
            await remote.execute('tx.send', [bob.addr, 5000000000]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);

            //Bob购买凭证 100 
            ret = await remote.execute('stock.auction', [cp.id, alice.addr, 100, 2000, bob.name]);
            assert(!ret.error);

            //查询 Bob 的凭证余额 === 200
            ret = await remote.execute('stock.list.wallet', [[['cid', cp.id], ['addr', bob.addr]]]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1000);
            assert(ret.result.list[0].sum === 200);
        });
    
        it('验证凭证分配的有效性', async () => {
            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);

            let ret = await remote.execute('stock.record', [7, cp.id, 0]);
            assert(ret.result.list[0].price == 2000);
    
            ret = await remote.execute('stock.list', [[['cid', cp.id]]]);
            assert(ret.result.list.length == 2);
            
            //一共出售了 500 凭证
            for(let item of ret.result.list) {
                if(item.stock.addr == alice.addr) {
                    //alice 现在有 300
                    assert(item.stock.sum === 300);
                } else if(item.stock.addr == bob.addr) {
                    //bob 现在有 200
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
            //在之前的测试中，连挖10个块尚不足以确保生成CP快照，改为30个后测试恢复正常
            await remote.execute('miner.generate.admin', [30]); 
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1000);
        });
    
        it('发起支付交易，然后查询支付流水', async () => {
            //发起一笔支付交易，使用bob的子账户支付
            let ret = await remote.execute('order.pay', [cp.id, bob.name, bob.sn(), 1000000000, bob.name]);
            assert(!ret.error);
            //@note 此处sn使用了随机数，实际运用中建议使用自增长序列，以便后期增量查询
            //@note 上述支付将按照约定，分配给凭证持有方(alice bob)、媒体方(alice)

            //再发起一笔支付交易，使用bob的子账户支付
            ret = await remote.execute('order.pay', [cp.id, bob.name, bob.sn(), 1000000000, bob.name]);
            assert(!ret.error);
            //@note 上述支付将按照约定，分配给凭证持有方(alice bob)、媒体方(alice)

            //挖矿以确保数据上链
            await remote.execute('miner.generate.admin', [1]);

            //查询bob的交易流水 - 两笔
            ret = await remote.execute('order.query.wallet', [[['cid', cp.id]], bob.name]);
            assert(!ret.error && ret.result.list.length === 2);
        });
    
        it('查看媒体分润', async () => {
            //查询作为bob的推荐者，alice的媒体分成 - 两笔共 20 分得 15% = 3, 注意媒体分成是提前结算的
            let ret = await remote.execute('stock.record', [5, cp.id, 0, [['@total','price']]]);
            assert(!ret.error);
            assert(ret.result.price === 300000000, ret.result.price);
        });

        it('查看凭证分润', async () => {
            //查询凭证分成（扣除媒体分成后）, 包括 alice(300/5000500) 的两笔， bob(200/5000500) 的两笔，合计 1700000000*500/5000500, CP保留利润不计入其中
            let ret = await remote.execute('stock.record', [4, cp.id, 0, [['@total','price']]]);
            assert(!ret.error);
            assert(ret.result.price === 169980, ret.result.price);
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
    
        /**
         * 由于连挖4032个块会导致连接器超时，在 BLOCK_DAY = 144 的设定下，跳过如下两个单元测试
         */
        it.skip('连挖4032个块，确保度过冷却期', async () => {
            await remote.execute('miner.generate.admin', [4032]);
            await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(1500);
        });
    
    
        it.skip('再次发行凭证成功', async () => {
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
