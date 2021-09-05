/**
 * 联机单元测试：加密算法的种类
 * @description
    测试内容：
    1. 披露默认与可选支持的哈希算法、对称加密算法、非对称加密算法种类。
    默认支持的哈希算法是 sha256, 对任意输入哈希结果为32字节数据散列值, 实际应用中存在双哈希或多次哈希的情形
    对称加密算法是 AES-256
    非对称加密算法是ECDSA(椭圆曲线数字签名算法)，其曲线参数使用secp256k1
    
    2. 调用加密算法的接口或根据企业披露查看相应的代码
    
    3. 使用默认加密算法创建账号，并发送一笔转账类交易
    
    预期结果：
    1. 披露内容详尽完善
    2. 默认加密算法创建账号成功
    3. 发送交易成功
 */

const assert = require('assert');
const uuid = require('uuid/v1');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

const digest = remote.gamegold.crypto.digest;
const utils = remote.gamegold.utils;

let env = {
    alice: {name: `Alice-${uuid()}`,},
};

describe('加密算法的种类', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    it('调用SHA256求哈希, 散列值长度规定为32字节', async () => {
        let ret = digest.hash256('hello world');
        console.log(`'hello world' 的哈希值为：${ret.toString('hex')}`);
    });

    it('调用AES256做对称加解密, 明文长度16n情况下，密文长度16(n+1)', async () => {
        let {aeskey, aesiv} = remote.getAes();
        let ori = 'hello world';
        let ret_en = toolkit.encrypt(aeskey, aesiv, ori);
        let ret_de = toolkit.decrypt(aeskey, aesiv, ret_en);
        console.log('明文', ori);
        console.log('密文', ret_en);
        console.log('解密', ret_de);
    });

    it('调用secp256k1签名，验证签名的正确性', () => {
        console.log('生成密钥对');
        let key = utils.generateKey();
        let msg = 'hello world hello world hello world';
        console.log('使用私钥签名');
        let sig = utils.signObj(msg, key.private);
        console.log('使用公钥验证签名');
        assert(utils.verifyObj(msg, sig, Buffer.from(key.public, 'hex')));
    });

    it('使用默认加密算法创建Alice账号', async () => {
        await remote.execute('account.create', [{name: env.alice.name}]);

        let ret = await remote.execute('address.receive', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.result;
    });

    it('查询Alice账户的余额：0', async () => {
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        console.log(`${env.alice.name} 的账户余额: ${ret.result}`);
    });

    it('向Alice账户转账：1', async () => {
        await remote.execute('tx.send', [env.alice.address, 100000000]);
        await remote.execute('miner.generate.admin', [1]);
    });

    it('查询Alice账户的余额：1', async () => {
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        console.log(`${env.alice.name} 的账户余额: ${ret.result}`);
    });
});
