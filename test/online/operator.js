/**
 * 联机单元测试：模拟CRM系统中操作员管理流程
 */

const assert = require('assert')

//引入工具包
const toolkit = require('gamegoldtoolkit')

//创建授权式连接器实例
const remote = new toolkit.conn();

//AES密钥和向量
let aesKey = '$-._s1ZshKZ6WissH5gOs1ZshKZ6Wiss'; //32位长度
let aesIv = '$-._aB9601152555'; //16位长度

//连接器设置
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    structured: true,
});

//中间环境变量
let env = {
    rootName: 'xxxxxxxx-game-gold-root-xxxxxxxxxxxx',
    rootToken: '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08',
    opName : 'operator',
    opToken: '02c6754571e0cf8949fb71906a501ba520b8e960c7eb35cb3931e362e5d25d2bc5',
};

describe('操作员管理流程', () => {
    it('为指定操作员账号获取令牌', async () => {
        //用超级用户信息设置连接器
        remote.setup({type: 'testnet', cid: env.rootName, token: env.rootToken});

        //执行受限指令 - 成功
        let ret = await remote.execute('address.create', []);
        assert(!ret.error);

        //获取指定操作员的令牌
        ret = await remote.execute('sys.createAuthToken', [env.opName]);
        //解密得到最终的令牌
        env.opToken = toolkit.decrypt(aesKey, aesIv, ret.result[0].encry);
        console.log(env);
    });

    it('使用指定操作员账号连接并执行受限指令 - 失败', async () => {
        //用指定操作员信息设置连接器
        remote.setup({type: 'testnet', cid: env.opName, token: env.opToken});

        let ret = await remote.execute('address.create', []);
        assert(ret.error);
    });

    it('重新使用超级用户连接，将指定操作员加入分组', async () => {
        remote.setup({type: 'testnet', cid: env.rootName, token: env.rootToken});

        let ret = await remote.execute('sys.groupPrefix', [[['address', env.opName]]]);
        assert(!ret.error);

        ret = await remote.execute('sys.groupSuffix', [[['admin', env.opName]]]);
        assert(!ret.error);
    });

    it('使用指定操作员账号连接并执行受限指令 - 成功', async () => {
        //用指定操作员信息设置连接器
        remote.setup({type: 'testnet', cid: env.opName, token: env.opToken});

        let ret = await remote.execute('address.create', []);
        assert(!ret.error);
    });
});
