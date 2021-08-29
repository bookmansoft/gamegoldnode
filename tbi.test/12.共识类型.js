/**
 * 联机单元测试：共识类型
 * @description
    验证产品所支持的共识类型
    1.披露默认共识类型，以及所支持的其它共识类型
    在共识节点记账采用工作量证明共识算法(POW), 以解决竞争记账问题
    在共识节点选举环节采用权益证明共识算法(POS), 以解决共识节点扩充问题

    2.展示关键代码验证
 */

const assert = require('assert')
const uuid = require('uuid/v1');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

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

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

const consensus = remote.gamegold.consensus;

describe('共识类型', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('权益证明', async () => {
        console.log(`使用权益证明进行共识节点选举:`);
        console.log(`选举前，Alice尚未当选共识节点，记账操作失败`);

        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.address;

        ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        assert(!!ret.error);
    });

    it('权益证明：选举Alice为共识节点', async () => {
        let ret = await remote.execute('vote.send', [env.alice.address, 100000000]);
        assert(!ret.error);
    });

    it('工作量证明', async () => {
        console.log(`通过工作量证明形成共识区块，以切换选举统计区间(70个区块高度)`);
        await remote.execute('miner.generate.admin', [consensus.retargetInterval]); // 过大或过小都会导致统计周期意外切换，从而影响投票权的有效性
    });

    it('权益证明：查询Alice当前选举权', async () => {
        let ret = await remote.execute('vote.check', [env.alice.address]);
        assert(!ret.error);
        assert(ret.vote > 0);
    });

    it('权益证明：Alice当选共识节点', async () => {
        console.log(`选举后，Alice当选共识节点，记账操作成功`);
        let ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        assert(!ret.error);
    });
});
