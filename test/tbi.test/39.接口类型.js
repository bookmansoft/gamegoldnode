/**
 * 可信区块链功能测试
 * 检验项目：
 *  (39). 接口类型
 * 测试目的：
 *  验证系统所支持的接口类型
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.披露系统支持的接口类型，关键代码截图
    系统支持基于HTTP、WS协议的RPC接口，并已封装为JavaScript SDK供终端使用

    2.演示验证：依披露，使用相关接口，发起交易
 * 预期结果：
    披露内容详尽完善，演示与披露内容一致，交易成功
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const uuid = require('uuid/v1')
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
    alice: {
        name: uuid(),
        address: '',
    },
    tx: {},
}
//#endregion

describe('接口类型', () => {
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

    it('创建一笔交易数据并签名', async () => {
        //通过SDK，使用HTTP协议连接节点1，发起一笔转账交易
        let ret = await remote.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作成功
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        //通过SDK，使用HTTP协议连接节点1，发起共识记账操作
        await remote.execute('miner.generate.admin', [1]);
    });
});
