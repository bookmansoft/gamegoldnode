/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

const remote = (require('./connector'))();

/**
 * 测试所用的地址
 */
let addr = 'tb1qklv6yjmdve0vz04mpfk657leyt62wfe7jcxzqy';

describe.skip('地址相关的JSONP', function() {
    it('获取指定地址金额汇总信息', async () => {
        let ret = await remote.execute('getAddressSummary', [addr]);
        console.log(ret);
    });
    
    it('从订单中获取符合条件的地址集合', async () => {
        let ret = await remote.execute('address.filter', [null, null, null]);
        console.log(ret);
    });

    it('获取指定地址相关历史信息', async () => {
        let ret = await remote.setmode(remote.CommMode.ws).execute('getAddressHistory', [[addr]]);
        console.log(ret);
    });

    it('获取指定地址UTXO集合', async () => {
        let ret = await remote.execute('getAddressUnspentOutputs', [addr]);
        console.log(ret);
    });

    it('获取指定地址相关的交易ID列表', async () => {
        let ret = await remote.execute('getTxidsByAddress', [addr, 'input']);
        console.log(ret);
    });

    it('获取指定地址相关的交易列表', async () => {
        let ret = await remote.post('addrs/txs', {addr: addr});
        console.log(ret);
    });

    it('获取指定地址的汇总信息', async () => {
        let ret = await remote.get(`addr/${addr}`); 
        console.log(ret);
    });

    it('获取指定地址的UTXO', async () => {
        let ret = await remote.get(`addr/${addr}/utxo`);
        console.log(ret);
    });
});