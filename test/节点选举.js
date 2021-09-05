/**
 * 单元测试: 节点选举
 * @description 
 * 节点可通过如下两种方式获取记账权
 * 1. 获取官方节点证书
 * 2. 获取社区投票认可
 * 
 * 本单元测试展示第2种情形
 */

const assert = require('assert')
const uuid = require('uuid/v1');
const connector = require('../test/online/connector');

//引入核心库，在包引入模式下直接使用 require('gamegold')
const gamegold = require('../lib/gamegold');
const consensus = gamegold.consensus;

let env = {
    bossOid: 'xxxxxxxx-vallnet-boss-tokenxxxxx0000',
    bossCid: 'xxxxxxxx-vallnet-boss-xxxxxxxxxxxxxx',
    miner: {
        pid: '',
        address: '',
    },
    alice: {
        name: uuid(),
        address: '',
    }
}

const remote = connector();

describe('节点选举', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
    });

    for(let i = 0; i < 3; i++) {
        it('验证选举权：投票前，Alice记账失败', async () => {
            console.log(`第${i+1}轮测试开始`);
            let ret = await remote.execute('address.create', [env.alice.name]);
            assert(!ret.error);
            env.alice.address = ret.address;

            ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
            assert(!!ret.error);
        });

        it('投票选举：为Alice记账权投票，然后生成足够区块以切换统计区间', async () => {
            let ret = await remote.execute('vote.send', [env.alice.address, 100000000]);
            assert(!ret.error);

            //确保记账权变化生效
            await remote.execute('miner.generate.admin', [consensus.retargetInterval]); // 过大或过小都会导致统计周期意外切换，从而影响投票权的有效性
        });

        it('查询选举：查询Alice当前选举权', async () => {
            let ret = await remote.execute('vote.check', [env.alice.address]);
            assert(!ret.error);
            assert(ret.vote > 0);
        });

        it('验证选举权：投票后，Alice记账成功', async () => {
            let ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
            assert(!ret.error);
        });
    }
});
