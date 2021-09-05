/**
 * 可靠性测试：通过给系统加载一定的业务压力（例如资源在70%-90%的使用率）的情况下，让应用持续运行一段时间，测试系统在这种条件下是否能够稳定运行。
 */

const assert = require('assert');
const remote = (require('../lib/remote/connector'))();

let env = {};

describe('可靠性测试', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }

        ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.address;
    });

    it(`连续执行批量转账交易`, async () => {
        for(let y = 0; y < 5; y++) {
            let title = `批量转账交易(3000笔)第${y+1}次`;
            console.time(title);

            for(let x = 0; x < 6; x++) {
                //每500笔转账打包成一条交易记录
                let trans = [];
                for(let i = 0; i < 500; i++) {
                    trans.push({
                        value: 10000,
                        address: env.address,
                    });
                }
                //广播交易记录
                await remote.execute('tx.create', [
                    {
                      rate: 10000,
                      sendnow: true,
                    },
                    trans,
                ]);
            }
    
            //记账
            await remote.execute('miner.generate.admin', [1]);

            console.timeEnd(title);
        }
    });
});
