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

//设定测试所需的环境变量
let env = {
    cp: {
        name: "cp-"+ uuid().slice(0,33),    //企业名称，采用了随机生成字段 
        id: '',                             //企业证书编号，初始为空
        pubkey: '',                         //企业证书地址公钥，初始为空
    },
    alice: {
        name: "alice-"+ uuid().slice(0,30), //用户名称，采用了随机生成字段 
        address: '',                        //用户专属地址，充当见证人地址，初始为空
        erid:'',                            //缓存生成的存证编号，初始为空
    },
    content: 'hello world', //存证原始内容
};

describe('意愿存证', function() {
    /**
     * 单元测试模块前置处理流程
     */
    before(async () => {
        //强制设定链态的状态为：数据同步已完成
        await remote.execute('miner.setsync.admin', [true]);
        //确保链态的区块高度达到100以上，以有效激活通证
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    /**
     * 单元测试模块后置处理流程
     */
    after(() => {
        remote.close();
    });

	it('核心节点为企业注册证书', async () => {
       //注册一个新的CP
       let ret = await remote.execute('cp.create', [
           env.cp.name, 
           '127.0.0.1'
       ]);
	   env.cp.id = ret.cid;             //填充企业证书编号
	   env.cp.pubkey = ret.pubKey;      //填充企业证书地址公钥

       //确保该CP数据上链
       await remote.execute('miner.generate.admin', [1]);
       await remote.wait(1000);

       //查询并打印CP信息, 注意在CP数据上链前，查询将得不到正确结果
       ret = await remote.execute('cp.byName', [
           env.cp.name
       ]);
       assert(env.cp.name == ret.name); //断言名称相吻合

    
       await remote.execute('tx.create', [{"sendnow":true}, [{"value":200000000, "account": env.cp.id}]]);
    });

	it('核心节点查询企业证书', async () => {
        //查询并打印CP信息, 注意在CP数据上链前，查询将得不到正确结果
        let ret = await remote.execute('cp.byName', [
            env.cp.name
        ]);
        assert(env.cp.name == ret.name); //断言名称相吻合
    });

    it('核心节点为企业充值', async () => {
        let ret = await remote.execute('tx.create', [{"sendnow":true}, [{"value":100000000, "account": env.cp.id}]]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('核心节点为企业用户注册证书', async () => {
		let ret = await remote.execute('cp.user', [
            env.cp.id,              //企业证书编号
            env.alice.name,         //用户编号
            null,                   //保留字段
            env.cp.id,              //企业证书编号
        ]);
		env.alice.address = ret.data.addr; //填充用户专属地址
	});

    it('用户签发意愿存证', async () => {
		//生成真实意愿存证文件的哈希值
		let hash = digest.hash256(Buffer.from(env.content)).toString('hex');

		//签发意愿存证
        let ret = await remote.execute('ca.issue', [
            env.alice.address,          //见证地址
            '',                         //证书名称，可置空
            env.cp.pubkey,           	//存证存储地址公钥
            hash,                		//存证内容哈希
            0,                          //相对有效期，即当前高度往前推定指定区块。填0表示使用默认相对有效期
            env.cp.id,                  //见证地址归属账号
        ]);
		assert(ret.erid);               //断言正确生成了存证编号
        env.alice.erid = ret.erid;      //保存存证编号

		//确保存证上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('查询存证：根据存证编号查询存证内容', async () => {
        let ret = await remote.execute('ca.list', [[['erid', env.alice.erid]]]);
        assert(ret.list[0].erid == env.alice.erid);
    });

    it('验证存证：验证存证的有效性 - 成功', async () => {
        let ret = await remote.execute('ca.verify', [env.alice.erid]);
        assert(ret && ret.verify);
    });

    it('废止存证：用户废止先前签发的意愿存证', async () => {
        let ret = await remote.execute('ca.abolish', [
            env.alice.address,             //见证地址
			env.alice.erid,                //已生成的存证编号
			0,                             //废止决定生效高度
			env.cp.id,			           //见证地址归属账号
        ]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('查询废止：查询存证废止列表', async () => {
        let ret = await remote.execute('ca.list.ab', [
            [['erid', env.alice.erid]]      //类似graphQL的查询语法
        ]);
        assert(ret.count == 1);
    });

    it('验证存证：验证存证的有效性 - 失败', async () => {
        let ret = await remote.execute('ca.verify', [
            env.alice.erid,        //存证编号
        ]);
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
        env.alice.erid = ret.erid;

		//确保存证上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('验证存证：验证存证的有效性 - 成功', async () => {
        let ret = await remote.execute('ca.verify', [env.alice.erid]);
        assert(ret && ret.verify);
    });

    it('存证过期：推进链态高度，使得证书失效', async () => {
        await remote.execute('miner.generate.admin', [6]);
    });

    it('验证存证：验证存证的有效性 - 失败', async () => {
        let ret = await remote.execute('ca.verify', [env.alice.erid]);
        assert(ret && !ret.verify);
    });
});
