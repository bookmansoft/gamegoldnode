/**
 * 单元测试：GIP0024 电子签章
 * Creted by liub 2020.04.20
 */

const assert = require('assert');
const uuid = require('uuid/v1')

const gamegold = require('gamegold');
const KeyRing = gamegold.keyring;
const HDPrivateKey = gamegold.hd.PrivateKey;
const base58 = gamegold.base58;
const utils = gamegold.utils;
const Address = gamegold.address;
const digest = gamegold.crypto.digest;

const remote = (require('../test/online/connector'))();

let env = {
    message: '风吹草低现牛羊', 
    key: KeyRing.generate(),
    cpa: {name: "cp-"+ uuid().slice(0,33)},
    cpb: {name: "cp-"+ uuid().slice(0,33)},
    alice: {name: "cp-"+ uuid().slice(0,33), erid:[]},
    bob: {name: "cp-"+ uuid().slice(0,33), erid:[]},
    content: 'b2f1083c1e8d68eeab9b20a455048e415ef80d440a7a77e4a771b70a719ef305',
};

let agreement = {
    title: 'agreement',
    body: 'hello world',
}

describe('GIP0024', function() {
    before(async ()=>{
        //开启长连模式
        remote.setmode(remote.CommMode.ws, async () => { });
        //监听消息
		await remote.watch(async msg => {
            //{
            // from: 'tb1qtljzq07w9heu2rffchjqzs5nvugnyxuver2e72',
            // to: 'tb1qhdew3erzv7zu85p83hdvhgutvnu59nh2vnxny5',
            // content: 
            // {
            //     type: 'agreement',
            //     payload: {
            //     data: {
            //         title: 'agreement',
            //         body: 'hello world',
            //         cid: 'bookman',
            //         addr: 'tb1qjjzznckmdfha7jty7v8vael4llr2047ufvwe9c',
            //         pubkey: '032dcb7ad0186098d0be4f425c71cac5da0328b0de641a9721b6d003cabb707209'
            //     },
            //     sig: '3045022100aba0c6752cb96bfd83789c57497b8f1cf2470e5fd8d8d58997c18aa8fc6de73d0220221571e2deb5e37d40d365c49e29904e0b56bb41c4034c0c5744d49242d8224a'
            //     }
            // }，            
            // wid: 1,
            // account: '67290f61-c3e6-11ea-a9df-571eb75568c0'
            //}
            if(msg.account == env.bob.name) {
                switch(msg.content.type) {
                    case 'agreement': {
                        assert.strictEqual(true, utils.verifyData(msg.content.payload));

                        console.log(`receive agreement from ${Address.fromWitnessPubkeyhash(digest.hash160(Buffer.from(msg.content.payload.data.pubkey, 'hex')), 'testnet')} to ${msg.to}`);

                        let content = digest.sha256(JSON.stringify(msg.content.payload.data)).toString('hex');
                        let ret = await remote.execute('ca.issue', [
                            env.bob.address,                          //签发地址
                            '',                                       //name
                            msg.content.payload.data.pubkey,          //address pubkey
                            content,                                  //content hash
                            0,                                        //height
                            env.bob.name,                             //[openid]
                        ]);
                        assert(ret.erid);
                        await remote.execute('miner.generate.admin', [1]);
        
                        env.bob.erid.unshift(ret.erid);
        
                        break;
                    }
                }                
            }
        }, 'notify/receive');
            
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
    });
    //#endregion

    it('加密算法：使用公钥加密、私钥解密', async () => { 
        //适用场景: Bob用Alice的公钥加密消息并发送给Alice，只有Alice能解读该消息
        //依赖条件：Bob必须事先得知Alice的公钥，这通常依赖于CA认证，或者Bob和Alice有点对点通讯的条件

        //使用公钥加密消息，得到加密数据包(包含密文和DH公钥)
        let packet = HDPrivateKey.eccEncrypt(env.message, env.key.publicKey);
        //使用私钥解密加密数据包
        let sim = HDPrivateKey.eccDecrypt(packet, env.key.privateKey);
        //验证解密正确
        assert(sim==env.message);
    });

    it('加密算法：使用私钥签名、公钥验签', async () => { 
        //适用场景: Alice签名消息并发送给Bob, Bob确认消息是Alice发送的
        //依赖条件：Bob必须通过CA对Alice的公钥进行认证

        //用私钥计算消息签名
        let sig = utils.signObj(env.message, env.key.privateKey);
        //用公钥验证签名的有效性
        assert(utils.verifyObj(env.message, sig, env.key.publicKey));
    });

    it('加密算法：使用私钥签名、自验签', async () => {
        //适用场景: Alice构造签名报文并广播，共识层确认该报文是自洽的(报文中的各项信息能相互验证)
        //例如，共识层可以确认该报文是由报文内含地址的所有者发出的

        //对数据对象进行签名，返回签名对象：打包了数据对象、公钥、地址和签名
        let data = env.key.signData({
            secret: env.message,
        });
        //对象自验签: 利用对象中包含的公钥进行校验，确认其中包含的签名、地址的有效性
        assert.strictEqual(true, utils.verifyData(data));
    });

    it('Alice生成地址', async () => {
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.address;
        env.alice.pubkey = ret.publicKey;

        ret = await remote.execute('key.export.private', [env.alice.address, env.alice.name]);
        assert(!ret.error);
        env.alice.prikey = base58.decode(ret).slice(1, 33);
    });

    it('Bob生成地址', async () => {
        let ret = await remote.execute('address.create', [env.bob.name]);
        assert(!ret.error);
        env.bob.address = ret.address;
        env.bob.pubkey = ret.publicKey;

        ret = await remote.execute('key.export.private', [env.bob.address, env.bob.name]);
        assert(!ret.error);
        env.bob.prikey = base58.decode(ret).slice(1, 33);

        await remote.execute('tx.send', [env.alice.address, 100000000]);
        await remote.execute('tx.send', [env.alice.address, 100000000]);
        await remote.execute('tx.send', [env.bob.address, 100000000]);
        await remote.execute('tx.send', [env.bob.address, 100000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('个人签发：Bob为Alice签发证书', async () => {
        let ret = await remote.execute('ca.issue', [
            env.bob.address,            //签发地址
            '',                         //name
            env.alice.pubkey,           //address pubkey
            env.content,                //content hash
            0,
            env.bob.name,
        ]);
        assert(ret.erid);
        env.alice.erid.unshift(ret.erid);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('查询证书：根据证书编号查询证书内容', async () => {
        let erid = env.alice.erid[0];
        let ret = await remote.execute('ca.list', [[['erid', erid]]]);
        assert(ret.list[0].erid == erid);
    });

    it('查询列表：查询证书列表', async () => {
        let erid = env.alice.erid[0];
        let ret = await remote.execute('ca.list.me', [[['erid', erid]]]);
        assert(ret.list[0].erid == erid);
    });

    it('验证证书：验证证书的有效性', async () => {
        let erid = env.alice.erid[0];
        let ret = await remote.execute('ca.verify', [erid]);
        assert(ret && ret.verify);
        //console.log(ret);
    });

    it('废止证书：Bob废止先前为Alice签发的证书', async () => {
        let ret = await remote.execute('ca.abolish', [
            env.bob.address,             //签发地址
            env.alice.erid[0],
        ]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('查询废止：查询电子证书废止列表', async () => {
        let ret = await remote.execute('ca.list.ab', [[['erid', env.alice.erid[0]]]]);
        assert(ret.count == 1);
    });

    it('验证证书：验证证书的有效性', async () => {
        let erid = env.alice.erid[0];
        let ret = await remote.execute('ca.verify', [erid]);
        assert(ret && !ret.verify);
    });

    it('机构注册：CPA注册', async () => {
        let ret = await remote.execute('cp.create', [env.cpa.name, '127.0.0.1']);
        assert(!ret.error);
        env.cpa.cid = ret.cid;
        env.cpa.address = ret.addr;
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('机构注册：CPB注册', async () => {
        let ret = await remote.execute('cp.create', [env.cpb.name, '127.0.0.1']);
        assert(!ret.error);
        env.cpb.cid = ret.cid;
        env.cpb.address = ret.addr;
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('机构签发：CPA为Alice签发证书', async () => {
        let ret = await remote.execute('ca.issue', [
            env.cpa.address,            //签发地址
            '',                         //name
            env.alice.address,          //address
            env.content,                //content hash
            0,                          //有效期，填0表示使用默认值
        ]);
        assert(ret.erid);
        env.alice.erid.unshift(ret.erid);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('查询证书：根据证书编号查询证书内容', async () => {
        let erid = env.alice.erid[0];
        let ret = await remote.execute('ca.list', [[['erid', erid]]]);
        assert(ret.list[0].erid == erid);
    });

    it('验证证书：验证证书的有效性', async () => {
        let erid = env.alice.erid[0];
        let ret = await remote.execute('ca.verify', [erid]);
        assert(ret && ret.verify);
        //console.log(ret);
    });

    it('机构增信：CPB为CPA增信', async () => {
        let ret = await remote.execute('ca.enchance', [
            env.cpa.cid,
            env.cpb.cid,
        ]);
        assert(!ret.error);
        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('查询信用：查询CA信用等级', async () => {
        let ret = await remote.execute('ca.rank', [env.cpa.cid]);
        console.log(`rank of ${env.cpa.cid}: ${ret}`);
    });

    it('签署电子合同：Alice和Bob签署电子合同', async () => {
        //Alice本地签署合同
        const ring = new KeyRing({
            network: 'testnet',
            privateKey: env.alice.prikey,
            witness: true,
        });
        env.alice.agreement = ring.signData(agreement);

        //Alice向Bob发起合同签署请求
        console.log(`send agreement to ${env.bob.address}`)
        await remote.execute('comm.notify', [
            env.bob.address,                                            //通知地址
            {type: 'agreement', payload: env.alice.agreement},          //content
            env.alice.name,                                             //发送账号
        ]);
        await remote.wait(2000);

        assert(env.bob.erid[0]);
    });

    it('验证电子合同：第三方检索验证Alice和Bob签署的电子合同', async () => {
        //检索合同，查看签署人列表并验证签名
        let erid = env.bob.erid[0];
        let ret = await remote.execute('ca.list', [[['erid', erid]]]);
        /** ret.list[0]
            {
            oper: 'erIssue',
            erid: '9ad56350-caa2-11ea-af83-0768c3780f90',
            witness: '039ba89a71f7b16a5acacb7f7231f4812ae81f479277111ec4422f279dfa36f107',
            validHeight: 2618,
            signature: '3044022024972da0e328b83ce7e04812eb23379203f632661271c1da8cc757764fcb7f8902202d2f59c59632edc6cb730537f1b33da13df5c6ff029f097cc98cdc47a588eb77',
            source: {
                subjectName: '9ad56350-caa2-11ea-af83-0768c3780f90',
                pubkey: '02eb41fd23bc2f6de753fd685ab5154f81e476e9879463134a40d53c0bdec4c6a9',
                subjectHash: 'cdfbc9c7f626c834eab70c05654391fecdc5e47412157b2d6e2186eeaae9ef12'
            },
            wid: 0,
            account: ''
            }
         */
        assert(ret.list[0].erid == erid);

        //第三方验证Alice的本地合同是自洽的(经过了Alice的签名)
        assert.strictEqual(true, utils.verifyData(env.alice.agreement));

        //第三方验证Alice的本地合同中的Alice公钥，和链上合同中的Alice公钥一致
        assert.strictEqual(ret.list[0].source.pubkey, env.alice.agreement.data.pubkey);

        //第三方验证Alice的本地合同哈希值和链上合同哈希值相同
        assert.strictEqual(ret.list[0].source.subjectHash, digest.sha256(JSON.stringify(env.alice.agreement.data)).toString('hex'));
        
        //第三方验证证明(链上合同)是自洽的
        ret = await remote.execute('ca.verify', [erid]);
        assert(ret && ret.verify);
    });
});
