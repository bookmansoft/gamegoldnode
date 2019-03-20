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
        let msg = await remote.execute('getDetailedTransaction', ['6bb91e4dc6744265f0a8e165c7acf2a742b49f4af7e14e57daca8e1b115c3e8a']);
        console.log(msg);
    });

    it('获取相关的交易信息', async () => {
        let msg = await remote.execute('getRawTransaction', ['6bb91e4dc6744265f0a8e165c7acf2a742b49f4af7e14e57daca8e1b115c3e8a']);
        console.log(msg);
    });

    it('获取相关的交易信息', async () => {
        let msg = await remote.execute('getTransaction', ['6bb91e4dc6744265f0a8e165c7acf2a742b49f4af7e14e57daca8e1b115c3e8a']);
        console.log(msg);
    });

    it('从内存池查询交易信息', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('getMempoolTransaction', ['6bb91e4dc6744265f0a8e165c7acf2a742b49f4af7e14e57daca8e1b115c3e8a']);
        console.log(msg);
    });
});
