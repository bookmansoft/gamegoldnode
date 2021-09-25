/**
 * 可信区块链功能测试
 * 检验项目：
 *  (27). 长时间运行稳定性测试
 * 测试目的：验证系统长时间运行场景下的稳定性表现
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1. 发送恒定的交易数(测试中 TPS 设定为 10笔/秒，为当前系统设定峰值的10%)，持续时间最少4小时
 * 预期结果：
    1.系统正常提供服务
    2.成功率维持在较高水平
 */

//#region 引入SDK
const uuid = require('uuid/v1')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = (require('../../lib/remote/connector'))({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,     //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {name: uuid()},
};
//#endregion

describe('长时间运行稳定性测试', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }

        ret = await remote.execute('address.create', [env.alice.name]);
        env.alice.address = ret.address;
    });

    it(`转账交易: 处理多笔转账交易`, async () => {
        //使用SDK连接节点1，以TPS=10的匀速持续发起转账交易
        for(let j = 0; j < 1; j++) {
            let title = `转账交易`;
            console.time(title);
            for(let i = 0; i < 100; i++) {
                await remote.execute('tx.create', [
                    {
                      rate: 10000,
                      sendnow: true,
                    },
                    [{
                        value: 10000,
                        address: env.alice.address,
                    }],
                ]);
                console.timeLog(title, '交易集合已广播');
            }
            await remote.execute('miner.generate.admin', [1]);
            console.timeLog(title, '交易集合已上链');
            console.timeEnd(title);
        }
        //@note 由于系统大量使用LRU高速缓存表，内存占用会在一定时间范围内持续增加，直至峰值
    });
});
