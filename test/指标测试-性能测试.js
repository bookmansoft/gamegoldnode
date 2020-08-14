/**
 * 性能测试：对指定业务压力量和使用场景组合，测试系统的性能是否满足预定指标要求。
 */

const assert = require('assert');
const remote = (require('../test/online/connector'))();

let env = {
    address: [],
    recy: 100,
};

describe('性能测试', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
    });

    it(`连续执行${env.recy}笔简单查询(系统应答)，QPS>200，可通过硬件升级和平行架构提升`, async () => {
        console.time('系统应答测试');
        for(let i = 0; i< env.recy; i++) {
            await remote.execute('sysEcho', []);
        }
        console.timeEnd('系统应答测试');
    });

    it(`连续、单笔执行${env.recy}笔简单事务(创建新的地址)，TPS>30，可通过硬件升级和平行架构提升`, async () => {
        console.time('创建地址');
        for(let i = 0; i < env.recy; i++) {
            let ret = await remote.execute('address.create', []);
            env.address.push(ret.address);
        }
        console.timeEnd('创建地址');
    });

    it(`连续执行${env.recy}笔精确查询(查询指定地址)，TPS>30，可通过硬件升级和平行架构提升`, async () => {
        console.time('查询地址');
        for(let i = 0; i< env.recy; i++) {
            await remote.execute('address.has', [env.address[i]]);
        }
        console.timeEnd('查询地址');
    });

    it(`处理${env.recy}笔复杂业务(转账交易)，TPS>30，可通过硬件升级和平行架构提升`, async () => {
        let title = `处理${env.recy}笔转账交易`;
        console.time(title);

        //打包交易记录
        let trans = [];
        for(let i = 0; i < env.recy; i++) {
            trans.push({
                value: 10000,
                address: env.address[i],
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

        //写入区块
        await remote.execute('miner.generate.admin', [1]);

        console.timeEnd(title);
    });
});
