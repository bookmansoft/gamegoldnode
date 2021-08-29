/**
 * 联机单元测试：接口类型
 * @description
    验证系统所支持的接口类型
    1.披露系统支持的接口类型，关键代码截图
    系统支持HTTP接口

    2.演示验证：依披露，使用相关接口，发起交易
    使用Postman进行演示认证，发起 block.tips 调用并获得应答
    
    预期结果：披露内容详尽完善，演示与披露内容一致，交易成功
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

let env = {
    alice: {
        name: 'alice',
        address: '',
    },
    tx: {},
}

describe('接口类型', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    after(()=>{
        remote.close();
    });

    it('创建一笔交易数据并签名', async () => {
        let ret = await remote.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
    });

    it('共识与扩散', async () => {
        await remote.execute('miner.generate.admin', [1]);
    });
});
