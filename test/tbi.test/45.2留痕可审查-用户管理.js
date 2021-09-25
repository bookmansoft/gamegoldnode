/**
 * 可信区块链功能测试
 * 检验项目：
 *  (45.2). 留痕可审查
 * 测试目的：验证产品具有留痕可审计能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.关键行为留痕可审计：
        用户管理行为（新增、删除、冻结、解冻等）
    2.依披露依次演示验证
 * 预期结果：披露信息完整，演示与披露一致，关键操作均有留痕。
 */

//#region 引入SDK
const assert = require('assert');
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
const remoteOperator = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    value: 5000000,
}; 
//#endregion
 
describe('留痕可审查-用户管理', () => {
    before(async () => {
        await remote.execute('sys.devmode', [false]);

        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    after(async ()=>{
        remote.close();
    });

    it('管理员创建新用户', async () => {
        env.opName = "oper-"+ uuid().slice(0,31); //生成随机的操作员账号

        //连接节点1，系统管理员创建操作员令牌
        let ret = await remote.execute('sys.createAuthToken', [env.opName]);
        env.opToken = remote.decryptToken(ret.result[0].encry);

        //用操作员信息设置连接器
        remoteOperator.setup({type: 'testnet', cid: env.opName, token: env.opToken});
    });

    it('新用户连接系统并执行指令 - 成功', async () => {
        //被分配令牌的新用户，连接节点1，执行非受限指令
        let ret = await remoteOperator.execute('block.count', []);
        //断言成功
        assert(!ret.error);
    });

    it('管理员将新用户冻结', async () => {
        //系统管理员连接节点1，将新用户加入'forbid'前缀分组
        let ret = await remote.execute('sys.groupPrefix', [[['forbid', env.opName]]]);
        assert(!ret.error);
    });

    it('新用户连接系统并执行指令 - 失败', async () => {
        //新用户连接节点1，执行非受限指令
        let ret = await remoteOperator.execute('block.count', []);
        //断言失败，因为被加入冻结名单
        assert(!!ret.error);
        //打印错误信息
        console.log(ret.error);
    });

    it('管理员将新用户解冻', async () => {
        //系统管理员连接节点1，将新用户移出'forbid'前缀分组
        let ret = await remote.execute('sys.groupPrefix', [[['forbid', env.opName]], true]);
        assert(!ret.error);
    });

    it('新用户连接系统并执行指令 - 成功', async () => {
        //新用户连接节点1，执行非受限指令
        let ret = await remoteOperator.execute('block.count', []);
        //断言操作成功
        assert(!ret.error);
    });

    it('查询用户管理操作审计日志', async () => {
        //系统管理员连接节点1，查询并打印用户操作审计日志
        let ret = await remote.execute('sys.log', [[['oper','usermanager']]]);
        assert(!ret.error);

        console.log(ret.result);
    });
});
