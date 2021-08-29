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
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

describe('留痕可审查-节点管理', () => {
    it('查询节点管理操作审计日志', async () => {
        let ret = await remote.execute('sys.log', [[['oper','node.create']]]);
        console.log(ret.result);

        ret = await remote.execute('sys.log', [[['oper','node.delete']]]);
        console.log(ret.result);

        ret = await remote.execute('sys.log', [[['oper','node.update']]]);
        console.log(ret.result);
    });
});
