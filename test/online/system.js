/**
 * 单元测试：系统状态相关的 API
 * Creted by liub 2018.9.11
 */

//引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数

describe('区块相关的JSONP', function() {
    it('获取同步状态', async () => {
        let msg = await remote.get('sync');
        console.log(msg);
    });

    it('获取手续费信息', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('estimateFee', ['2']);
        console.log(msg);
    });

    it('获取汇率', async () => {
        let msg = await remote.get('currency');
        console.log(msg);
    });

    it('获取主管道信息', async () => {
        let msg = await remote.get('peer');
        console.log(msg);
    });

    it('获取手续费信息', async () => {
        let msg = await remote.get('utils/estimatefee');
        console.log(msg);
    });

    it('获取版本信息', async () => {
        let msg = await remote.get('version');
        console.log(msg);
    });

    it('获取状态信息', async () => {
        let msg = await remote.get('status');
        console.log(msg);
    });

    it('获取同步状态', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('isSynced', []);
        console.log(msg);
    });

    it('获取同步进度百分比数值', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('syncPercentage', []);
        console.log(msg);
    });

    it('获取区块头哈希', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('getBestBlockHash', []);
        console.log(msg);
    });

    it('获取支持币种', async () => {
        let msg = await remote.get('explorers');
        console.log(msg);
    });
});
