/**
 * 联机单元测试：基础转账功能
 * @description
 */

const assert = require('assert')
const connector = require('../test/util/connector');

const remote = connector({structured: true});
let env = {};

describe('交易管理', () => {
    before(async () => {
        //强制设置同步完成标志
        await remote.execute('miner.setsync.admin', [true]);
        //检测块高度，必要时进行挖矿以确保创世区块成熟
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
    });

    it('发送交易：发送交易至指定地址', async () => {
        let ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
        env.amount = 100000000;

        ret = await remote.execute('tx.send', [env.address, env.amount]);
        assert(!ret.error);
        env.hash = ret.result.hash;
    });

    it('按哈希查询交易：查询指定哈希对应的交易记录', async () => {
        let ret = await remote.execute('tx.get', [env.hash]);
        assert(!ret.error);
        assert(env.hash == ret.result.hash);
    });

    it('按地址查询交易：查询指定地址下的交易列表', async () => {
        let ret = await remote.execute('tx.list.address', [env.address]);
        assert(!ret.error);
    });

    it('查询历史交易：查询历史交易列表', async () => {
        let ret = await remote.execute('tx.list', [null, 1]);
        assert(!ret.error);
    });
});
