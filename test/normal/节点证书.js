/**
 * 单元测试: 节点证书
 * @description 
 * 节点可通过如下两种方式获取记账权
 * 1. 获取官方节点证书
 * 2. 获取社区投票认可
 * 
 * 本单元测试展示第1种情形
 */

const assert = require('assert')
const uuid = require('uuid/v1');
const connector = require('../lib/remote/connector');

//引入核心库，在包引入模式下直接使用 require('gamegold')
const gamegold = require('gamegold');
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

describe('节点证书', () => {
    before(async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', [true]);
        //检测块高度，必要时进行记账以确保创世区块成熟
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
    });

    it('验证证书：获取记账证书前，Alice记账失败', async () => {
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.address;

        await remote.execute('tx.send', [env.alice.address, 500000000]);
        assert(!ret.error);

        ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        assert(!!ret.error);
    });

    it('查询证书：管理员查询记账证书列表', async () => {
        //查询本地节点记账证书列表
        let ret = await remote.execute('prop.query', [[['oid', env.bossOid], ['account', 'default']]]);
        assert(!ret.error);
        
        // 如果存在多于一个的记账证书, 则取第一个登记在env.miner名下.
        assert(ret.list.length > 0 && ret.list[0].cid == env.bossCid)

        env.miner.pid = ret.list[0].pid;
        env.miner.address = ret.list[0].current.address;
    });

    it('转让证书：管理员向Alice转让记账证书，然后生成足够区块以切换统计区间', async () => {
        //转让记账证书
        let ret = await remote.execute('prop.send', [env.alice.address, env.miner.pid]);
        assert(!ret.error);

        //生成足够区块，确保证书转移生效
        await remote.execute('miner.generate.admin', [consensus.retargetInterval]);
    });

    it('查询证书：查询Alice名下的记账证书', async () => {
        let ret = await remote.execute('prop.query', [[['oid', env.bossOid], ['account', env.alice.name]]]);
        assert(!ret.error && ret.list[0].pid === env.miner.pid);
    });

    it('验证证书：获取记账证书后，Alice记账成功', async () => {
        let ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        assert(!ret.error);
        await remote.wait(1000);
    });

    it('转让证书：Alice归还记账证书，然后生成足够区块以切换统计区间', async () => {
        let ret = await remote.execute('prop.send', [env.miner.address, env.miner.pid, env.alice.name]);
        assert(!ret.error);

        //确保记账权变化生效
        await remote.execute('miner.generate.admin', [consensus.retargetInterval]);
    });

    it('验证证书：失去记账证书后，Alice记账失败', async () => {
        let ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        assert(!!ret.error);
    });
});
