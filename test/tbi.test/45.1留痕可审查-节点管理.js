/**
 * 可信区块链功能测试
 * 检验项目：
 *  (45.1). 留痕可审查
 * 测试目的：验证产品具有留痕可审计能力
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.关键行为留痕可审计：
        节点管理行为（加入、退出、升级等）
    2.依披露依次演示验证
 * 预期结果：披露信息完整，演示与披露一致，关键操作均有留痕。
 */

//#region 引入SDK
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

describe('留痕可审查-节点管理', () => {
    it('查询节点管理操作审计日志', async () => {
        //连接节点1，查询并打印节点创建记录
        let ret = await remote.execute('sys.log', [[['oper','node.create']]]);
        console.log(ret.result);

        //连接节点1，查询并打印节点删除记录
        ret = await remote.execute('sys.log', [[['oper','node.delete']]]);
        console.log(ret.result);

        //连接节点1，查询并打印节点更新记录
        ret = await remote.execute('sys.log', [[['oper','node.update']]]);
        console.log(ret.result);
    });
});
