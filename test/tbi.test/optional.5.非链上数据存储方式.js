/**
 * 可信区块链功能测试
 * 检验项目：
 *  (5). 非链上数据存储方式
 * 测试目的：验证系统非链上数据存储方式
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
 *  非链上数据描述披露，非链上数据指非结构化关联文件、索引数据、统计数据、非链上缓存数据、私有数据等，披露内容包括：
    1.支持的数据库类型，支持数据库类型灵活配置
    系统当前支持[leveldb]和[indexeddb] lib/db/backends.js lib/db/backends-browser.js

    2.敏感数据加密存储
    非链上数据采用哈希前缀树模式存储，其索引定义文件为 lib/wallet/layout.js，形式如下所示:
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
    钱包中的私钥信息属于非链上数据，以哈希前缀树模式，加密存储于专用库文件中。
 * 预期结果：披露内容详尽
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
const env = {};
//#endregion

describe('非链上数据存储方式', () => {
    it('打印钱包库中存储的主私钥和助记词', async () => {
        //连接节点1，查询并打印处于解密状态的钱包主私钥
        let ret = await remoteA.execute('key.master.admin', []);
        assert(!ret.error);
        console.log(ret.result);
    });
});