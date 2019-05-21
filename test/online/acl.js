/**
 * 联机单元测试：ACL访问控制中，对操作员账号的管理流程
 * @description 在实际运用中，中台负责设定并记录各个操作员的权限，然后在启动时通过 sys.groupPrefix / sys.groupSuffix 指令对全节点进行权限设置
 */

const assert = require('assert')
const uuid = require('uuid/v1');

//引入工具包
const toolkit = require('gamegoldtoolkit')

//AES密钥和向量
let aesKey = '$-._s1ZshKZ6WissH5gOs1ZshKZ6Wiss'; //32位长度
let aesIv = '$-._aB9601152555'; //16位长度

//中间环境变量
let env = {
    rootName: 'xxxxxxxx-game-gold-root-xxxxxxxxxxxx',
    rootToken: '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08',
};

//创建管理员使用的连接器，并设置相应的参数
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid: env.rootName, 
    token: env.rootToken,
    structured: true,
});

//创建操作员使用的连接器，并设置相应的参数
const remoteOperator = new toolkit.conn();
remoteOperator.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    structured: true,
});

describe.only('操作员管理', () => {
    it('管理员为操作员分配令牌', async () => {
        env.opName = uuid(); //生成随机的操作员账号

        //获取操作员的令牌密文
        ret = await remote.execute('sys.createAuthToken', [env.opName]);
        //解密得到令牌明文
        env.opToken = toolkit.decrypt(aesKey, aesIv, ret.result[0].encry);

        //用操作员信息设置连接器
        remoteOperator.setup({type: 'testnet', cid: env.opName, token: env.opToken});
    });

    it('使用操作员账号连接并执行受限指令 - 失败', async () => {
        //操作员尚未得到ACL授权，操作失败
        let ret = await remoteOperator.execute('address.create', []);
        assert(ret.error);
    });

    it('使用超级用户连接，将指定操作员加入分组', async () => {
        //将操作员加入'address'前缀分组
        let ret = await remote.execute('sys.groupPrefix', [[['address', env.opName]]]);
        assert(!ret.error);
    });

    it('使用指定操作员账号连接并执行受限指令 - 成功', async () => {
        //操作员得到了ACL授权，操作成功
        let ret = await remoteOperator.execute('address.create', []);
        assert(!ret.error);
    });
});
