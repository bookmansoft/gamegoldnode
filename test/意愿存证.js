/**
 * 联机单元测试：意愿存证
 * Creted by liub 2020.10.30
 */

const uuid = require('uuid/v1')
const assert = require('assert');
const remote = (require('../lib/remote/connector'))({
    //ip: '127.0.0.1',
    //port: 2112,
});
const gamegold = require('gamegold');
const digest = gamegold.crypto.digest;

//设定测试所需的环境变量
let env = {
    cp: {
        name: "cp-"+ uuid().slice(0,33),    //企业名称，采用了随机生成字段 
        id: '',                             //企业证书编号，初始为空
        pubkey: '',                         //企业证书地址公钥，初始为空
    },
    alice: {
        name: String(((Math.random() * Math.pow(2, 32))|0)>>>0), //用户名称，采用了随机生成字段 
        address: '',                        //用户专属地址，充当见证人地址，初始为空
        pubkey: '',                         //企业证书地址公钥，初始为空
        erid:'',                            //缓存生成的存证编号，初始为空
    },
    get randomHash() {
		//生成真实意愿存证文件的哈希值，是对原始信息进行了两次标准 SHA256 运算所得结果
		return digest.hash256(Buffer.from(uuid())).toString('hex');
    },
    get sameHash() {
		//生成真实意愿存证文件的哈希值，是对原始信息进行了两次标准 SHA256 运算所得结果
		return digest.hash256(Buffer.from('helloworld')).toString('hex');
    }
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
       assert(!ret.error);
	   env.cp.id = ret.cid;             //填充企业证书编号
       env.cp.address = ret.pubAddress; //填充企业证书地址
	   env.cp.pubkey = ret.pubKey;      //填充企业证书地址公钥

       //确保该CP数据上链
       await remote.execute('miner.generate.admin', [1]);
       await remote.wait(1000);
    });

	it('核心节点查询企业证书', async () => {
       //查询并打印CP信息, 注意在CP数据上链前，查询将得不到正确结果
        let ret = await remote.execute('cp.byName', [
            env.cp.name
        ]);
        assert(env.cp.name == ret.name); //断言名称相吻合
    });

    it('用户签发意愿存证 - 成功', async () => {
		//签发意愿存证
        let ret = await remote.execute('ca.issue', [
            {
                name: env.alice.name,   //证书名称，可置空
                hash: env.sameHash,     //存证内容哈希
                height: 0,              //相对有效期，即当前高度往前推定指定区块。填0表示使用默认相对有效期
                cluster: env.cp.id,     //簇值
            },
            env.alice.name,             //见证用户
            env.cp.id,                  //CPID
        ]);
		assert(ret.erid);               //断言正确生成了存证编号
        env.alice.erid = ret.erid;      //从返回值中获取存证编号

        //确保存证上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('用户签发意愿存证 - 因为哈希冲突而失败', async () => {
        let ret = await remote.execute('ca.issue', [
            {
                name: env.alice.name,   //证书名称，可置空
                hash: env.sameHash,     //存证内容哈希
                height: 0,              //相对有效期，即当前高度往前推定指定区块。填0表示使用默认相对有效期
                cluster: env.cp.id,     //簇值
            },
            env.alice.name,             //见证用户
            env.cp.id,                  //CPID
        ]);
		assert(ret.error);              //断言哈希冲突
    });

    it('查询存证：根据存证编号查询存证', async () => {
        let ret = await remote.execute('ca.list', [[['erid', env.alice.erid]]]);
        assert(ret.list[0].erid == env.alice.erid);
    });

    it('查询存证：根据用户名称查询存证', async () => {
        let ret = await remote.execute('ca.user.status', [
            env.cp.id, 
            env.alice.name, 
            [
                ['aliancename', null],          //联盟名称
                ['page', 1],                    //可选项，指定显示页数
                ['size', 10],                   //可选项，指定每页条数
                ['source.cluster', env.cp.id],  //可选项，精确指定簇值，'source.cluster'表示是二级属性
            ]
        ]);
        assert(ret.list[0].erid == env.alice.erid);
        assert(!!ret.list[0].verify);
    });

    it('查询日志：根据用户名称查询存证日志', async () => {
        let ret = await remote.execute('ca.user.log', [
            env.cp.id, 
            env.alice.name, 
            [
                ['aliancename', null],          //联盟名称
                ['page', 1],                    //可选项，指定显示页数
                ['size', 10],                   //可选项，指定每页条数
            ]
        ]);
        assert(ret.list[0].erid == env.alice.erid);
    });

    it('验证存证：验证存证的有效性 - 成功', async () => {
        let ret = await remote.execute('ca.verify', [env.alice.erid]);
        assert(ret && ret.verify);
    });

    it('废止存证：用户废止先前签发的意愿存证', async () => {
        //注意：入参现为二维数组形式，可一次性发起多笔废止交易
        let ret = await remote.execute('ca.abolish', [
            [
                [
                    env.alice.name,
                    env.cp.id,			           //见证地址归属账号
                    env.alice.erid,                //已生成的存证编号
                    0,                             //废止决定生效高度
                ],
            ]
        ]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('查询废止：查询存证废止列表', async () => {
        let ret = await remote.execute('ca.list.ab', [
            [['erid', env.alice.erid]],
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
		//签发意愿存证
        let ret = await remote.execute('ca.issue', [
            {
                name: env.alice.name,   //存证名称
                hash: env.randomHash,   //存证内容哈希
                height: 2,              //相对有效期，填0表示使用默认值
                cluster: env.cp.id,     //簇值
            },
            env.alice.name,             //见证用户
            env.cp.id,                  //CPID
            '',         	            //盟友名称 aliancename
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
        await remote.execute('miner.generate.admin', [3]);
    });

    it('验证存证：验证存证的有效性 - 失败', async () => {
        let ret = await remote.execute('ca.verify', [env.alice.erid]);
        assert(ret && !ret.verify);
    });

	it('核心节点吊销企业证书', async () => {
        //查询并打印CP信息, 注意在CP数据上链前，查询将得不到正确结果
        let ret = await remote.execute('cp.change', [
            env.cp.id, ',,,forbidden'
        ]);
        assert(ret && env.cp.name == ret.newName); //断言名称相吻合
        await remote.execute('miner.generate.admin', [1]); //确保数据上链
    });

    it('用户签发意愿存证 - 失败', async () => {
        await remote.wait(3000); //钱包库同步需要一些时间

		//签发意愿存证
        let ret = await remote.execute('ca.issue', [
            {
                name: env.alice.name,   //存证名称
                hash: env.randomHash,   //存证内容哈希
                height: 5,              //相对有效期，填0表示使用默认值
                cluster: env.cp.id,     //簇值
            },
            env.alice.name,             //见证用户
            env.cp.id,                  //CPID
            '',         	            //盟友名称 aliancename
        ]);
        assert(ret.error);
    });
});
