/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

 //引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数

describe('交易相关的JSONP', function() {
    it('获取相关的交易信息', async () => {
        let msg = await remote.execute('getDetailedTransaction', ['ef912e42d5538f4ef06271cdb66b47e05b28067000ecdf568a28c0ce26ebc19c']);
        console.log(msg);
    });

    it('获取相关的交易信息', async () => {
        let msg = await remote.execute('getRawTransaction', ['ef912e42d5538f4ef06271cdb66b47e05b28067000ecdf568a28c0ce26ebc19c']);
        console.log(msg);
    });

    it('获取相关的交易信息', async () => {
        let msg = await remote.execute('getTransaction', ['ef912e42d5538f4ef06271cdb66b47e05b28067000ecdf568a28c0ce26ebc19c']);
        console.log(msg);
    });

    it('从内存池查询交易信息', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('getMempoolTransaction', ['802f945284eed5ea0dddf04b1d825677e3d9271267d3b18081cd2ca9406b0c79']);
        console.log(msg);
    });
});
