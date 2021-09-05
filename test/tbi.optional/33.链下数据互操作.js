/**
 * 联机单元测试：链下数据互操作
 * @description
    验证链上链下数据安全可信交互能力
    1.披露链上链下交互方案，重点披露如何保证数据交互过程的安全可信，包括数据来源可信、传输过程可信、执行结果可信等
    2.链上链下交互演示：
        1）链上从链下获取数据；
        2）链下从链上获取数据；
    演示过程中，突出来源可信、传输可信、执行结果可信三个关键要素。
    
    预取效果：
    1.与披露项一致
    2.链上链下数据交互演示成功
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

describe('链下数据互操作', () => {
    it('加密钱包', async () => {
        let ret = await remoteA.execute('wallet.encrypt', ['hello']);
        assert(!ret.error);
    });
    it('打印处于加密状态的主私钥', async () => {
        let ret = await remoteA.execute('key.master.admin', []);
        assert(!ret.error);
        console.log(ret.result);
    });
    it('解密钱包', async () => {
        let ret = await remoteA.execute('wallet.decrypt', ['hello']);
        assert(!ret.error);
    });
    it('打印处于解密状态的主私钥和助记词', async () => {
        let ret = await remoteA.execute('key.master.admin', []);
        assert(!ret.error);
        console.log(ret.result);
    });
});