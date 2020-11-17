/**
 * 联机单元测试：意愿存证
 * Creted by liub 2020.10.30
 */

const uuid = require('uuid/v1')
const assert = require('assert');
const remote = (require('../test/util/connector'))();
const gamegold = require('gamegold');
const digest = gamegold.crypto.digest;
const base58 = gamegold.base58;

let env = {
    cp: {name: "cp-"+ uuid().slice(0,33), erid:''},
    alice: {name: "alice-"+ uuid().slice(0,30), erid:'', address:''},
    content: 'hello world', //存证原始内容
};

describe('意愿存证', function() {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    after(() => {
        remote.close();
    });

	it('核心节点为企业注册证书', async () => {
       //注册一个新的CP
       let ret = await remote.execute('cp.create', [env.cp.name, '127.0.0.1']);

       //确保该CP数据上链
       await remote.execute('miner.generate.admin', [1]);
       await remote.wait(1000);

       //查询并打印CP信息
       ret = await remote.execute('cp.byName', [env.cp.name]);
	   env.cp.id = ret.cid;
	   env.cp.pubkey = ret.pubKey;
	   assert(env.cp.name == ret.name);
    });

    it('核心节点为企业用户注册证书', async () => {
		let ret = await remote.execute('cp.user', [env.cp.id, env.alice.name, null, env.cp.id]);
		env.alice.address = ret.data.addr;

        ret = await remote.execute('key.export.private', [env.alice.address, env.cp.id]);
        assert(!ret.error);
        env.alice.prikey = base58.decode(ret).slice(1, 33);

		await remote.execute('tx.send', [env.alice.address, 100000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
	});

    it('用户签发意愿存证', async () => {
		//生成真实意愿存证文件的哈希值
		let hash = digest.hash256(Buffer.from(env.content)).toString('hex');

		//签发意愿存证
        let ret = await remote.execute('ca.issue', [
            env.alice.address,          //见证地址
            '',                         //证书名称
            env.cp.pubkey,           	//目标地址公钥
            hash,                		//内容哈希
            0,                          //相对有效期，填0表示使用默认值
            env.cp.id,                  //见证地址归属账号
        ]);
		assert(ret.erid);
		//保存存证编号
        env.cp.erid = ret.erid;

		//确保存证上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('查询存证：根据存证编号查询存证内容', async () => {
        let ret = await remote.execute('ca.list', [[['erid', env.cp.erid]]]);
        assert(ret.list[0].erid == env.cp.erid);
    });

    it('验证存证：验证存证的有效性 - 成功', async () => {
        let ret = await remote.execute('ca.verify', [env.cp.erid]);
        assert(ret && ret.verify);
    });

    it('废止存证：用户废止先前签发的意愿存证', async () => {
        let ret = await remote.execute('ca.abolish', [
            env.alice.address,             //签发地址
			env.cp.erid,
			0,
			env.cp.id,			
        ]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('查询废止：查询存证废止列表', async () => {
        let ret = await remote.execute('ca.list.ab', [[['erid', env.cp.erid]]]);
        assert(ret.count == 1);
    });

    it('验证存证：验证存证的有效性 - 失败', async () => {
        let ret = await remote.execute('ca.verify', [env.cp.erid]);
        assert(ret && !ret.verify);
    });

    it('用户签发意愿存证', async () => {
        //生成真实意愿存证文件的哈希值
		let hash = digest.hash256(Buffer.from(env.content)).toString('hex');

		//签发意愿存证
        let ret = await remote.execute('ca.issue', [
            env.alice.address,          //见证地址
            '',                         //存证名称
            env.cp.pubkey,           	//存证地址公钥
            hash,                		//存证内容哈希
            5,                          //相对有效期，填0表示使用默认值
            env.cp.id,                  //见证地址归属账户
        ]);
		assert(ret.erid);
		//保存存证编号
        env.cp.erid = ret.erid;

		//确保存证上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('验证存证：验证存证的有效性 - 成功', async () => {
        let ret = await remote.execute('ca.verify', [env.cp.erid]);
        assert(ret && ret.verify);
    });

    it('存证过期：推进链态高度，使得证书失效', async () => {
        await remote.execute('miner.generate.admin', [6]);
    });

    it('验证存证：验证存证的有效性 - 失败', async () => {
        let ret = await remote.execute('ca.verify', [env.cp.erid]);
        assert(ret && !ret.verify);
    });
});
