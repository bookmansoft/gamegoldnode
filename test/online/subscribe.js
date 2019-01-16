/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

//引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数

describe('订阅与退订', function() {
    it('订阅区块消息', async () => {
        await remote.setmode(remote.CommMode.ws).watch(msg => {
            console.log('notify', msg);
        }, 'p2p/block').execute('subscribe', ['p2p/block']);
        await remote.execute('unsubscribe', ['p2p/block']);
    });
});
