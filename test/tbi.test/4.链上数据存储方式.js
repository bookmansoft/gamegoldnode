/**
 * 联机单元测试：链上数据存储方式
 * @description
    验证系统所支持的数据存储方式，披露账本数据（区块、交易等）以及状态数据的存储方式，包括：
    1.支持的数据库类型，支持数据库类型灵活配置
    系统当前支持[leveldb]和[indexeddb] lib/db/backends.js lib/db/backends-browser.js
    同时支持[rocksdb]和[lmdb]，但其兼容性尚需进一步验证，同时为减少包体大小，发行版并未打包[rocksdb]和[lmdb]库 lib/db/ldb.js 

    2.敏感数据加密存储
    对私钥进行加密保存，需要口令才能访问私钥和助记词
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

describe('链上数据存储方式', () => {
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
