/**
 * 联机单元测试：用户管理
 * @description
 * 可以选用两种经典模式之一来使用钱包系统:
 * 1. 单用户模式：
 *  适用于SPV钱包应用。
 *  用户拥有对根钱包的完全控制权，并可以创建任意多的衍生钱包并同样拥有完全控制权。
 *  用户还可以按照用途不同，在指定钱包下创建任意多的账户，以更好的划分往来账目
 * 2. 多用户模式
 *  适用于SCRM应用。用户被划分为超级用户(具有唯一性)和普通用户(数量不限)
 *  超级用户拥有对根钱包的完全控制权，并扮演普通用户代理角色
 *  超级用户在根钱包下，为每个普通用户生成并分配一个映射账户，作为普通用户通过用户代理提交的操作的作用域
 *  普通用户必须通过用户代理提交操作，其影响域限定于映射账户内。
 *  普通用户可以用衍生地址作为索引，生成任意数量的衍生钱包，并拥有对该钱包的完全控制权
 * 
 * 多用户管理机制：
 * 1. 超级用户为普通用户映射账户并分配访问令牌
 * 2. 超级用户为普通用户设置权限(ACL)
 * 3. 普通用户通过专有连接和节点交互
 * 
 * 在实际运用中，中台负责设定并记录各个操作员的权限，然后在启动时通过 sys.groupPrefix / sys.groupSuffix 指令对全节点进行权限设置
*/

const assert = require('assert')
const uuid = require('uuid/v1');
const toolkit = require('gamerpc')
const connector = require('../lib/remote/connector');

//创建超级用户使用的连接器
const remote = connector({structured: true});
//创建普通用户使用的连接器
const remoteOperator = connector({structured: true});
//创建用于事件监控的长连模式的连接器
const monitor = connector({structured: true});

//中间环境变量
let env = {
    account: "oper-"+ uuid().slice(0,31), //生成随机的操作员账号
    amount: 100000000,
};

describe('用户管理', () => {
    before(async () => {
        await remote.execute('sys.devmode', [false]);
        await remote.execute('miner.setsync.admin', []);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100-ret.result[0].height]);
        }
    });

    after(async ()=>{
        await remote.execute('sys.devmode', [true]);
        remote.close();
    });

    it('分配令牌：超级用户为普通用户映射账户并分配令牌', async () => {
        //超级用户执行指令，为普通用户分配令牌
        let ret = await remote.execute('sys.createAuthToken', [env.account]);

        //解密得到令牌明文，分配给普通用户
        let {aeskey, aesiv} = remote.getAes();
        env.opToken = toolkit.decrypt(aeskey, aesiv, ret.result[0].encry);

        //普通用户使用令牌信息设置连接器属性
        remoteOperator.setup({
            type: 'testnet', 
            cid: env.account, 
            token: env.opToken
        });
    });

    it('添加成员：超级用户将指定用户加入指定角色的成员列表', async () => {
        //添加前：普通用户执行受限指令 - 失败
        let ret = await remoteOperator.execute('address.create', []);
        assert(ret.error);

        //超级用户将普通用户加入'address'前缀分组
        ret = await remote.execute('sys.groupPrefix', [[['address', env.account]]]);
        assert(!ret.error);

        //添加后：普通用户执行受限指令 - 成功
        ret = await remoteOperator.execute('address.create', []);
        assert(!ret.error);
    });

    it('移除成员：超级用户将指定用户移出指定角色的成员列表', async () => {
        //超级用户将普通用户从'address'前缀分组移除
        let ret = await remote.execute('sys.groupPrefix', [[['address', env.account]], true]);
        assert(!ret.error);

        //移除后：普通用户执行受限指令 - 失败
        ret = await remoteOperator.execute('address.create', []);
        assert(ret.error);
    });

    it('初始化：在节点重启事件处理句柄中，从业务中台导入权限初始设定', async () => {
        //订阅并监控主网重启事件
        await monitor.setmode(monitor.CommMode.ws).watch(async function(msg) {
            //当捕获到重启事件时，重新设定ACL
            console.log('Info: Got event chain/full, Try to reset ACL...');

            let ret = await remote.execute('sys.groupPrefix', [[['address', env.account]]]);
            assert(!ret.error);

            console.log('Info: Finished Reset ACL.');
            monitor.execute('unsubscribe', ['chain/full']);
        }, 'chain/full').execute('subscribe', ['chain/full']);

        //强制设置同步完成标志，以模拟触发全节点[chain/full]事件
        await remote.execute('miner.setsync.admin', []);
        //设置一个等待时间，以测试事件捕获机制
        await remote.wait(200);
    });

    it('用户转账：超级用户为普通用户转账', async () => {
        //转账前：账户余额等于零
        let ret = await remoteOperator.execute('balance.all', []);
        assert(!ret.error && ret.result.confirmed == 0);

        //超级用户向普通用户转账
        await remote.execute('tx.create', [{"sendnow":true}, [{"value":env.amount, "account": env.account}]]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500); //等待一个间隔，以便让钱包有时间处理事件

        //转账后：普通用户校验账户余额
        ret = await remoteOperator.execute('balance.all', []);
        assert(!ret.error && ret.result.confirmed == env.amount);

        //转账后：超级用户校验账户余额
        ret = await remote.execute('balance.all', [env.account]);
        assert(!ret.error && ret.result.confirmed == env.amount);
    });
});
