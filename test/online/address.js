/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

//引入工具包
const toolkit = require('gamerpc')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch')); //兼容性设置，提供模拟浏览器环境中的 fetch 函数

/**
 * 测试所用的地址
 */
let addr = 'tb1qklv6yjmdve0vz04mpfk657leyt62wfe7jcxzqy';

describe('地址相关的JSONP', function() {
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
        let ret = await remote.watch(msg => {
            console.log('receive notify:', msg);
        }, remote.NotifyType.version).post('addrs/txs', {addr:'f29bf2c260126e79d1da038c44314142d9010a6785c1c7c7ae2b023794f084e7'});
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