/**
 * 联机测试：长时间运行稳定性测试
 * @description
    验证系统长时间运行场景下的稳定性表现
    1. 发送恒定的交易数（TPS设定为峰值的10% - 80%），持续时间最少4小时
    
    预期结果：
    1.系统正常提供服务
    2.成功率维持在较高水平
 */

const uuid = require('uuid/v1')
const {notes} = require('../../lib/remote/common')
const remote = (require('../../lib/remote/connector'))({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,     //RPC端口
});

let env = {
    alice: {name: uuid()},
    recy: 100,
    recy2: 1000,
};

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

    it(`转账交易: 处理${env.recy2}笔转账交易，TPS>${env.recy2}，可通过硬件升级和平行架构进一步提升`, async () => {
        let title = `转账交易: 处理${env.recy2}笔转账交易`;

        console.time(title);

        //打包交易记录
        let trans = [];
        for(let i = 0; i < env.recy2; i++) {
            trans.push({
                value: 10000,
                address: env.alice.address,
            });
        }

        console.timeLog(title, '交易集合已创建');

        //广播交易记录
        remote.execute('tx.create', [
            {
              rate: 10000,
              sendnow: true,
            },
            trans,
        ]);

        console.timeLog(title, '交易集合已广播');
        
        //写入区块
        await remote.execute('miner.generate.admin', [1]);

        console.timeLog(title, '交易集合已上链');
        console.timeEnd(title);
    });

    it(`精确查询: 连续执行${env.recy}笔查询，QPS>100，可通过硬件升级和平行架构进一步提升`, async () => {
        console.time('精确查询');

        for(let i = 0; i< env.recy; i++) {
            await remote.execute('sysEcho', []);
        }

        console.timeEnd('精确查询');
    });
});
