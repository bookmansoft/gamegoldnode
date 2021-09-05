/**
 * 压力测试：测试系统在一定饱和状态下，例如CPU、内存等在饱和使用情况下，系统能够处理的会话能力，以及系统是否会出现错误。
 */

const remote = (require('../test/online/connector'))();

describe('压力测试', () => {
    before(async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', [true]);
    });

    it(`大量执行复杂的记账操作`, async () => {
        let recy = 100;
        let title = `连续计算并生成${recy}个记账区块(每个区块最大可容纳3000笔交易)`;

        console.time(title);
        for(let i = 0; i < recy; i++) {
            let str = `生成新的区块(${i})`;
            console.time(str);
            await remote.execute('miner.generate.admin', [1]);
            console.timeEnd(str);
        }
        console.timeEnd(title);
    });
});
