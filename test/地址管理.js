/**
 * 单元测试：地址相关的RPC调用
 * Creted by liub 2018.9.11
 */

const assert = require('assert');
const remote = (require('../lib/remote/connector'))();

let env = {};

describe('地址管理', function() {
    it('创建地址：创建一个新地址', async () => {
        let ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.address;
    });

    it('查询余额：获取指定地址金额汇总信息', async () => {
        let ret = await remote.execute('getAddressSummary', [env.address]);
        assert(!ret.error);
        env.summary = ret;
    });

    it('查询账户地址：列表指定账户下收款地址', async () => {
        let ret = await remote.execute('address.receive', ['default']);
        assert(!ret.error);
    });

    it('查询概要：获取指定地址的汇总信息', async () => {
        let ret = await remote.get(`addr/${env.address}`); 
        assert(!ret.error);
        env.balance = ret;
    });

    it('查询进项：根据地址查询进项', async () => {
        let ret = await remote.execute('address.received.list', []);
        assert(!ret.error);
        env.receivedList = ret;
    });

    it('查询进项总额：根据地址查询进项总额', async () => {
        let ret = await remote.execute('address.received', [env.address]);
        assert(!ret.error);
        env.received = ret;
    });

    it('查询归属账户：查询指定地址对应的账户', async () => {
        let ret = await remote.execute('address.account', [env.address]);
        assert(!ret.error);
        env.account = ret;
    });
    
    it('查询余额：获取指定地址金额汇总信息', async () => {
        let ret = await remote.execute('address.amount', [env.address]);
        assert(!ret.error   );
        env.amount = ret;
    });

    it('查询订单：查询从订单中获取符合条件的地址集合', async () => {
        let ret = await remote.execute('address.filter', [null, null, null]);
        assert(!ret.error);
    });

    it('查询历史：获取指定地址相关历史信息', async () => {
        let ret = await remote.execute('getAddressHistory', [[env.address]]);
        assert(!ret.error);
    });

    it('查询通证：获取指定地址UTXO集合', async () => {
        let ret = await remote.execute('getAddressUnspentOutputs', [env.address]);
        assert(!ret.error);
    });

    it('查询交易：获取指定地址相关的交易ID列表', async () => {
        let ret = await remote.execute('getTxidsByAddress', [env.address, 'input']);
        assert(!ret.error);
        env.inputs = ret;
    });

    it('查询交易：获取指定地址相关的交易列表', async () => {
        let ret = await remote.post('addrs/txs', {addr:env.address});
        assert(!ret.error);
        env.txs = ret;
    });

    it('查询通证：获取指定地址的UTXO', async () => {
        let ret = await remote.get(`addr/${env.address}/utxo`);
        assert(!ret.error);
        env.utxo = ret;
    });
});