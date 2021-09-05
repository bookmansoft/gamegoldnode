/**
 * 联机单元测试：数据访问隐私保护
 * @description
    披露区块链系统数据访问隐私保护方案，如数据存储隔离，数据加密存储，数据访问权限管理等
    
    预期结果：展示结果与披露项一致
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

describe('数据访问隐私保护', () => {
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