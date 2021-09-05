/**
 * 联机单元测试：非链上数据存储方式
 * @description
    验证系统非链上数据存储方式。非链上数据描述披露，非链上数据指非结构化关联文件、索引数据、统计数据、非链上缓存数据、私有数据等
    披露内容包括：
    1.支持的数据库类型，支持数据库类型灵活配置
    系统当前支持[leveldb]和[indexeddb] lib/db/backends.js lib/db/backends-browser.js
    非链上数据采用哈希前缀树模式存储，例如:
        // const layout = {
        //     binary: true,
        //     * CP[cid] -> cpItem  使用长度36的生产者编码cid生成键, 映射到生产者注册信息
        //     CP: function CP(cid, encode = 'ascii') {
        //         cid = layout.s2b(cid, encode);
        //         let key = Buffer.allocUnsafe(37);
        //         key[0] = 0x93; // C + P
        //         write(key, cid, 1);
        //         return key;
        //     },
        //     * CP的逆运算：从键中提取生产者编码cid
        //     CPc: function CPc(key) {
        //         let cid;
        //         if (key.length === 37) {
        //          cid = key.slice(1, 37);
        //         } else {
        //          assert(false);
        //         }
        //         return layout.b2s(cid);
        //     },
        // }

    2.敏感数据加密存储
    
    代码及配置项展示验证：
    1. 披露内容详尽
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

describe('非链上数据存储方式', () => {
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