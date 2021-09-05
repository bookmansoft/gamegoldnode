/**
 * 负载测试：通过在被测系统上不断增加压力，直到性能指标，例如“响应时间”超过预定指标或者某种资源使用已经达到饱和状态时系统的处理极限。
 */
const assert = require('assert');
const connector = require('../test/online/connector');

let env = {
    address: [],
    txid: [],
    recy: 10,
};

let conn = [];
for(let i = 0; i < env.recy; i++) {
    conn.push(connector());
}

describe('负载测试', () => {
    before(async () => {
        await conn[0].execute('miner.setsync.admin', [true]);
        let ret = await conn[0].execute('block.tips', []);
        if(ret[0].height < 100) {
            await conn[0].execute('miner.generate.admin', [100 - ret[0].height]);
        }
    });

    it('简单事务: adress.create', async () => {
        console.time('创建地址');
        for(let i = 0; i < env.recy; i++) {
            let ret = await conn[0].execute('address.create', []);
            env.address.push(ret.address);
        }
        console.timeEnd('创建地址');
    });

    it('多路并发执行业务指令', async () => {
        for(let i = 0; i< env.recy; i++) {
            let title = `查询地址并转账[第${i+1}路连接]`;
            console.time(title);
            conn[i].execute('address.has', [env.address[i]]).then(rt=>{
                console.timeLog(title, rt);
                conn[i].execute('tx.send', [env.address[i], 100000]).then(ret=>{
                    console.timeLog(title, ret.tx);
                    console.timeEnd(title);
                });
            });
        }
    });
});
