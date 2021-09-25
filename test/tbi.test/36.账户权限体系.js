/**
 * 可信区块链功能测试
 * 检验项目：
 *  (36). 账户权限体系
 * 测试目的：
 *  验证产品具备账户用户权限管理的能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.披露系统的用户体系，账户角色包括系统管理员、组织管理员、普通用户等
        1. 系统管理员为普通用户映射账户并分配访问令牌
        2. 系统管理员为普通用户设置权限(ACL)
        3. 普通用户通过专有连接和节点交互
    2.披露不同账户角色默认拥有的权限能力，以及是否支持用户权限可配置
    3.依披露，演示验证
 * 预期结果：
    披露内容完善详尽，演示结果与披露内容一致
 */

//#region 引入SDK
const assert = require('assert')
const uuid = require('uuid/v1');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
//创建超级用户使用的连接器
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//创建普通用户使用的连接器
const remoteOperator = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    account: "oper-"+ uuid().slice(0,31), //生成随机的操作员账号
    amount: 100000000,
};
//#endregion

describe('账户权限体系', () => {
    before(async () => {
        await remote.execute('sys.devmode', [false]);
    });
    after(async ()=>{
        remote.close();
    });

    it('分配令牌：超级用户为普通用户映射账户并分配令牌', async () => {
        //连接节点1，超级用户执行指令，为普通用户分配令牌
        let ret = await remote.execute('sys.createAuthToken', [env.account]);
        //解密得到令牌明文，分配给普通用户
        env.opToken = remote.decryptToken(ret.result[0].encry);

        //普通用户使用令牌信息设置连接器属性
        remoteOperator.setup({
            type: 'testnet', 
            cid: env.account, 
            token: env.opToken,
        });
    });

    it('添加权限前：普通用户执行受限指令 - 失败', async () => {
        //普通用户连接节点1，执行受限指令
        let ret = await remoteOperator.execute('address.create', []);
        //断言操作失败，因为权限不足
        assert(ret.error);
        //打印错误信息
        console.log(ret.error);
    });

    it('添加成员：超级用户将指定用户加入指定角色的成员列表', async () => {
        //超级用户连接节点1，发起指令调用，将普通用户加入'address'前缀分组
        let ret = await remote.execute('sys.groupPrefix', [[['address', env.account]]]);
        assert(!ret.error);
    });

    it('添加权限后：普通用户执行受限指令 - 成功', async () => {
        //普通用户连接节点1，执行受限指令
        let ret = await remoteOperator.execute('address.create', []);
        //断言操作成功，因为已被分配权限
        assert(!ret.error);
    });

    it('移除成员：超级用户将指定用户移出指定角色的成员列表', async () => {
        //超级用户连接节点1，将普通用户从'address'前缀分组移除
        let ret = await remote.execute('sys.groupPrefix', [[['address', env.account]], true]);
        assert(!ret.error);
    });

    it('移除权限后：普通用户执行受限指令 - 失败', async () => {
        //普通用户连接节点1，再次执行受限指令
        let ret = await remoteOperator.execute('address.create', []);
        //断言操作失败，因为已被移除权限
        assert(ret.error);
        //打印错误信息
        console.log(ret.error);
    });
});
