/**
 * 联机单元测试：留痕可审查
 * @description
    验证产品具有留痕可审计能力
    1.关键行为留痕可审计，关键行为包括但不限于：
        节点管理行为（加入、退出、升级等）
        用户管理行为（新增、删除、冻结、解冻等）
        合约管理（部署、升级、调用、销毁等）
    2.依披露依次演示验证，包括节点管理、用户管理、合约管理三个场景
    
    预期结果：披露信息完整，演示与披露一致，关键操作均有留痕。
 */

const assert = require('assert');
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

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

let env = {
     value: 5000000,
 }; 
 
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

        //获取操作员的令牌密文
        let ret = await remote.execute('sys.createAuthToken', [env.opName]);
        env.opToken = remote.decryptToken(ret.result[0].encry);

        //用操作员信息设置连接器
        remoteOperator.setup({type: 'testnet', cid: env.opName, token: env.opToken});
    });

    it('新用户连接系统并执行指令 - 成功', async () => {
        let ret = await remoteOperator.execute('block.count', []);
        assert(!ret.error);
    });

    it('管理员将新用户冻结', async () => {
        //将操作员加入'forbid'前缀分组
        let ret = await remote.execute('sys.groupPrefix', [[['forbid', env.opName]]]);
        assert(!ret.error);
    });

    it('新用户连接系统并执行指令 - 失败', async () => {
        let ret = await remoteOperator.execute('block.count', []);
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('管理员将新用户解冻', async () => {
        //将操作员移出'forbid'前缀分组
        let ret = await remote.execute('sys.groupPrefix', [[['forbid', env.opName]], true]);
        assert(!ret.error);
    });

    it('新用户连接系统并执行指令 - 成功', async () => {
        let ret = await remoteOperator.execute('block.count', []);
        assert(!ret.error);
    });

    it('查询用户管理操作审计日志', async () => {
        let ret = await remote.execute('sys.log', [[['oper','usermanager']]]);
        assert(!ret.error);

        console.log(ret.result);
    });
});
