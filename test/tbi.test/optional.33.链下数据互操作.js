/**
 * 联机单元测试：链下数据互操作
 * @description
    验证链上链下数据安全可信交互能力
    1.披露链上链下交互方案，重点披露如何保证数据交互过程的安全可信，包括数据来源可信、传输过程可信、执行结果可信等
    2.链上链下交互演示：
        1）链上从链下获取数据；
        2）链下从链上获取数据；
    演示过程中，突出来源可信、传输可信、执行结果可信三个关键要素。
    
    预取效果：
    1.与披露项一致
    2.链上链下数据交互演示成功
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//引入核心库，在包引入模式下直接使用 require('gamegold')
const gamegold = require('gamegold');
const consensus = gamegold.consensus;

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

describe('链下数据互操作', () => {
    before(async () => {
        await remoteA.execute('miner.setsync.admin', [true]);
        let ret = await remoteA.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remoteA.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remoteA.wait(500);
    });

    it('链上从链下获取数据', async () => {
        let ret = await remoteA.execute('oracle.send', ['state', 100, 1000000]);
        assert(!ret.error);
    });

    it('形成共识', async () => {
        await remoteA.execute('miner.generate.admin', [consensus.retargetInterval]);
        await remoteA.wait(1000);
    });

    it('链下从链上获取数据', async () => {
        let ret = await remoteA.execute('oracle.check', ['state']);
        assert(!ret.error);
        assert(ret.result.k == 'state' && ret.result.v == 100);
    });
});