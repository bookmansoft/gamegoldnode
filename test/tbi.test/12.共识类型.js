/**
 * 可信区块链功能测试
 * 检验项目：
 *  (12). 共识类型
 * 测试目的：
 *  验证产品所支持的共识类型
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.披露默认共识类型，以及所支持的其它共识类型
        在共识节点记账采用工作量证明共识算法(POW), 以解决竞争记账问题
        在共识节点选举环节采用权益证明共识算法(POS), 以解决共识节点扩充问题
    2.展示关键代码验证
 * 预期结果：
 *  1.披露信息完整
 */

const assert = require('assert')
const uuid = require('uuid/v1');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

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
    port: notes[0].rpc,    //RPC端口
});

const consensus = remote.gamegold.consensus;

describe('共识类型', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('权益证明', async () => {
        console.log(`使用权益证明进行共识节点选举:`);
        console.log(`选举前，Alice尚未当选共识节点，记账操作失败`);

        //通过SDK连接节点1，创建Alice账户
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.address;

        //使用Alice账户发起共识记账
        ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        //断言操作失败，因为Alice尚未当选为记账节点
        assert(!!ret.error);
    });

    it('权益证明：选举Alice为共识节点', async () => {
        //通过SDK连接节点1，由普通账户选举Alice为记账节点(POS共识算法)
        let ret = await remote.execute('vote.send', [env.alice.address, 100000000]);
        //断言操作成功
        assert(!ret.error);
    });

    it('工作量证明', async () => {
        //通过SDK连接节点1，发起共识请求，切换选举统计区间，以便让上述选举结果生效(POW共识算法)
        console.log(`通过工作量证明形成共识区块，以切换选举统计区间(70个区块高度)`);
        await remote.execute('miner.generate.admin', [consensus.retargetInterval]); // 过大或过小都会导致统计周期意外切换，从而影响投票权的有效性
    });

    it('权益证明：查询Alice当前选举权', async () => {
        //通过SDK连接节点1，查询Alice当选状态
        let ret = await remote.execute('vote.check', [env.alice.address]);
        assert(!ret.error);
        //断言Alice当选
        assert(ret.vote > 0);
    });

    it('权益证明：Alice当选共识节点', async () => {
        //通过SDK连接节点1，使用Alice账户发起共识记账操作
        console.log(`选举后，Alice当选共识节点，记账操作成功`);
        let ret = await remote.execute('miner.generateto.admin', [1, env.alice.address]);
        //断言操作成功
        assert(!ret.error);
    });
});
