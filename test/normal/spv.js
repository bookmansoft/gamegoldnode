/**
 * 联机单元测试：意愿存证
 * Creted by liub 2020.10.30
 */

 const uuid = require('uuid/v1')
 const assert = require('assert');
 const remote = (require('../lib/remote/connector'))({
     ip: '127.0.0.1',
     port: 2101,
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
         return digest.hash256(Buffer.from(uuid())).toString('hex');
     }
 };
 
 describe('意愿存证', function() {
 
     it('核心节点为企业注册证书', async () => {
        let ret = await remote.execute('block.tips', []);
		let cur = ret[0].height;

        //注册一个新的CP
        ret = await remote.execute('cp.create', [
            env.cp.name, 
            '127.0.0.1'
        ]);
        assert(!ret.error);
        env.cp.id = ret.cid;             //填充企业证书编号
        env.cp.address = ret.pubAddress; //填充企业证书地址
        env.cp.pubkey = ret.pubKey;      //填充企业证书地址公钥
 
        //确保该CP数据上链
		while(true) {
			ret = await remote.execute('block.tips', []);
			if(ret[0].height >= cur+2) {
				break;
			}
			await remote.wait(1000);
		}
 
        // env.cp.id = '70d3dd30-aa84-11eb-bf85-4d315b27b84e';             //填充企业证书编号
        // env.cp.address = 'tb1qp0949pppkcwdvllw97e8z05qqh7x0dglqer6xr'; //填充企业证书地址
        // env.cp.pubkey = '0283774e7028af496c6556f0675d2e6a79976665350ebb6e337680046dbbe9ecc9';      //填充企业证书地址公钥
    });
  
     for(let i = 0; i < 500000; i++) {
         it(`用户签发意愿存证 - 成功`, async () => {
             console.time('issue');
             //签发意愿存证
             await remote.execute('ca.issue', [
                 {
                     name: env.alice.name,   //证书名称，可置空
                     hash: env.sameHash,     //存证内容哈希
                     height: 0,              //相对有效期，即当前高度往前推定指定区块。填0表示使用默认相对有效期
                     cluster: env.cp.id,     //簇值
                 },
                 env.alice.name,             //见证用户
                 env.cp.id,                  //CPID
             ]);
             console.timeLog('issue', `第${i}条签署完成`);
			 await remote.wait(50);
             console.timeEnd('issue');
         });
     }
 });
