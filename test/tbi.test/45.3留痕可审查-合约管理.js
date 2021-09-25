/**
 * 可信区块链功能测试
 * 检验项目：
 *  (45.3). 留痕可审查
 * 测试目的：验证产品具有留痕可审计能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.关键行为留痕可审计：
        合约管理（部署、升级、调用、销毁等）
    2.依披露依次演示验证
 * 预期结果：披露信息完整，演示与披露一致，关键操作均有留痕。
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    contract: {},
}
//#endregion

describe('留痕可审查-合约管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    after(()=>{
        remote.close();
    });

    it('查询合约管理操作审计日志', async () => {
        //连接节点1，查询并打印合约注册日志
        let ret = await remote.execute('sys.log', [[['oper','scRegister']]]);
        assert(!ret.error);
        console.log(ret.result);

        //连接节点1，查询并打印合约冻结、解冻、销毁日志
        ret = await remote.execute('sys.log', [[['oper','scState']]]);
        assert(!ret.error);
        console.log(ret.result);

        //连接节点1，查询并打印合约升级日志
        ret = await remote.execute('sys.log', [[['oper','scUpdate']]]);
        assert(!ret.error);
        console.log(ret.result);

        //连接节点1，查询并打印合约执行日志
        ret = await remote.execute('sys.log', [[['oper','scrun']]]);
        assert(!ret.error);
        console.log(ret.result);
    });
});
