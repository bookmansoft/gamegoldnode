/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const assert = require('assert')

//引入工具包
const toolkit = require('gamegoldtoolkit')

//创建授权式连接器实例
const remote = new toolkit.conn();

//AES密钥和向量
let aesKey = '$-._s1ZshKZ6WissH5gOs1ZshKZ6Wiss'; //32位长度
let aesIv = '$-._aB9601152555'; //16位长度

remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'xxxxxxxx-game-gold-root-xxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
    token:  '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08', //授权节点令牌固定量，用于访问远程钱包时的认证
    structured: true,
});

describe('加解密', () => {
    it('获取节点令牌', async () => {
        let ret = await remote.execute('sys.createAuthToken', ['1,2,3']);
        for(let item of ret.result) {
            //解密字段
            let decode = toolkit.decrypt(aesKey, aesIv, item.encry);
            console.log(`cid:${item.cid}, token:${decode}`);

            //断言解密正确与否，注意接下来将会从RPC接口中移除 token 明文字段
            assert(item.token === decode);
        }
    });
});
