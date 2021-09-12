/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const uuidv1 = require('uuid/v1');
const assert = require('assert');
const remote = (require('../lib/remote/connector'))({structured: true});
const gamegold = require('gamegold');
const digest = gamegold.crypto.digest;
const Address = gamegold.address;

//在多个测试用例间传递中间结果的缓存变量
let env = {
    cp: {
        name: "stock-cp-"+ uuid().slice(0,27),
        id: '',
    },
    prop: {},
	alice: {
        erid: [],
        name: uuidv1(),
        prop: "prop-"+ uuid().slice(0,31),
        sn: ()=>{return "oid-alice-"+ uuid().slice(0,26);},     //订单编号
    },
	bob: {
        erid: [],
        name: uuidv1(),
        prop: "prop-"+ uuid().slice(0,31),
        sn: ()=>{return "oid-bob-"+ uuid().slice(0,28);},     //订单编号
    },
	eve: {
        erid: [],
        name: uuidv1(),
        prop: "prop-"+ uuid().slice(0,31),
        sn: ()=>{return "oid-eve-"+ uuid().slice(0,28);},     //订单编号
    },
};
let oid = "prop-oid-"+uuid().slice(0,27);

describe.skip('推荐信链上接口流程调测', () => {
    //#region 
    before(async ()=>{
        //开启长连模式
        remote.setmode(remote.CommMode.ws, async () => { });
        //监听消息
		await remote.watch(async msg => {
            // {
            //     from: 'tb1qtljzq07w9heu2rffchjqzs5nvugnyxuver2e72',
            //     to: 'tb1qhdew3erzv7zu85p83hdvhgutvnu59nh2vnxny5',
            //     content: {},
            //     wid: 1,
            //     account: '67290f61-c3e6-11ea-a9df-571eb75568c0'
            // }
            if(msg.account == env.alice.name) {
                switch(msg.content.type) {
                    case 'recommendation': {
                        console.log(`receive recommendation from ${Address.fromWitnessPubkeyhash(digest.hash160(Buffer.from(msg.content.payload, 'hex')), 'testnet')} to ${msg.to}`);

                        let content = digest.sha256(Buffer.from('德艺双馨')).toString('hex');
                        let ret = await remote.execute('ca.issue', [
                            {
                                name: '',                               //name
                                hash: content,                          //content hash
                                height: 0,                              //height
                            },
                            env.alice.address,                          //签发地址
                            msg.content.payload,                        //address pubkey
                            env.alice.name,                             //[openid]
                        ]);
                        assert(ret.result.erid);
                        await remote.execute('miner.generate.admin', [1]);
        
                        env.alice.erid.unshift(ret.result.erid);
        
                        break;
                    }
                }                
            }

            if(msg.account == env.eve.name) {
                switch(msg.content.type) {
                    case 'issue': {
                        console.log(`receive issue ${msg.content.payload} from ${msg.from} to ${msg.to}`);
        
                        break;
                    }
                }                
            }
        }, 'notify/receive').watch(async msg => {
            /**
                {
                    oper: 'erIssue',
                    erid: 'c468c1686533052f62a33c58eb834f6a1a1331d09db249a8807fee9615d5be14',
                    witness: '027b02eaffd4a970e39f71c29897d0bde4f5a016c8d27a6c20d360941bf63fdda8',
                    validHeight: 2393,
                    signature: '3045022100be91725dab14825e819873acc663d898bf4bb95c8cd8e3e4e78f562f7183857f022055b6a30ec49b61669fba51d0cc17ddb5f8d34e16530d8aa77b278e02ab7dc803',
                    source: {
                        subjectName: 'b439a680-c95d-11ea-bbed-f74d3521cef3',
                        pubkey: '03b397a397c192e434a41b53230ec194ecb7018e06a906fae292fb982cecfb356a',
                        subjectHash: 'c468c1686533052f62a33c58eb834f6a1a1331d09db249a8807fee9615d5be14'
                    },
                    wid: 1,
                    account: 'a935ac73-c95d-11ea-8235-9f15e9931086'
                }
            */
            if(msg.account == env.bob.name) {
                env.bob.erid.unshift(msg.erid);
            }
        }, 'ca/issue')
        .execute('subscribe', ['ca/issue']);
            
        //确保一定块高度，以便拥有足够多的成熟的余额
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        await remote.execute('miner.setsync.admin', [true]);
    });
    //#endregion

    it('为指定用户注册区块链身份证', async () => {
        await remote.execute('account.create', [{'name': env.alice.name},]);
        await remote.execute('account.create', [{'name': env.bob.name},]);
        await remote.execute('account.create', [{'name': env.eve.name},]);
    });

    it('为指定身份证生成专属链上地址', async ()=>{
        //为alice生成地址
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(ret.code == 0);
        env.alice.address = ret.result.address;
        env.alice.pubkey = ret.result.publicKey;

        //为bob生成地址
        ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;
        env.bob.pubkey = ret.result.publicKey;

        //为eve生成地址
        ret = await remote.execute('address.create', [env.eve.name]);
        assert(ret.code == 0);
        env.eve.address = ret.result.address;
        env.eve.pubkey = ret.result.publicKey;
    });

    it('Bob刷新地址', async () => {
        let ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;
        env.bob.pubkey = ret.result.publicKey;
    });

    it('购买积分', async () => {
        //完成支付后为用户添加积分, 为确保完成后续的推荐信流程，提前添加了一定量的小额UTXO
        for(let i = 0; i < 10; i++) {
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":100000000, "account": env.alice.name}]]);
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":100000000, "account": env.bob.name}]]);
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":100000000, "account": env.eve.name}]]);
        }

        await remote.execute('miner.generate.admin', [1]);
    });

    it('用户将积分赠与第三方', async () => {
        let ret = await remote.execute('tx.send', [env.alice.address, 20000000, env.bob.name]);
        assert(ret.code == 0);
    });

    it('注册CP', async () => {
        //注册一个新的CP
        let ret = await remote.execute('cp.create', [env.cp.name, '127.0.0.1']);
        env.cp.cid = ret.result.cid;
        env.cp.address = ret.result.addr;

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(2000);
    });

    it('创建道具', async ()=>{
        let ret = await remote.execute('prop.create', [env.cp.cid, oid, 10000]);
        assert(ret.code == 0);

        env.prop.hash = ret.result.hash;
        env.prop.pid = ret.result.pid;
    
        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
    });

    it('提供礼品二维码生成和核销接口', async () => {
        //模拟赠送道具给用户
        let ret = await remote.execute('prop.send', [env.alice.address, env.prop.pid]);
        assert(ret.code == 0);

        await remote.execute('miner.generate.admin', [1]);
        //!!停留一段时间，让钱包处理异步事件以更新本地数据库
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);

        //用户转账给商户
        ret = await remote.execute('prop.send', [env.bob.address, env.prop.pid, env.alice.name]);
        assert(ret.code == 0);

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
    });

    it('使用积分兑换商品', async () => {
        //发起一笔支付交易，使用bob的子账户支付
        let ret = await remote.execute('order.pay', [env.cp.cid, env.bob.name, env.bob.sn(), 10000000, env.bob.name]);
        assert(ret.code == 0);

        //支付成功后，系统发放礼品券
        ret = await remote.execute('prop.send', [env.bob.address, env.prop.pid]);
        assert(ret.code == 0);

        //确保该CP数据上链
        await remote.execute('miner.generate.admin', [1]);
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
    });

    it('用户间赠送礼品券', async () => {
        //Bob生成道具码
        let ret = await remote.execute('prop.donate', [env.prop.pid, env.bob.name]);
        assert(ret.code == 0);
        env.prop.raw = ret.result.raw;

        //Alice接收礼品券
        ret = await remote.execute('prop.receive', [env.prop.raw, env.alice.name]);
        assert(ret.code == 0);

        await remote.execute('miner.generate.admin', [1]);
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
    });

    it('按官方牌价八折自动回收礼品券', async () => {
        //用户将道具转入系统账户
        let ret = await remote.execute('prop.send', [env.cp.address, env.prop.pid, env.alice.name]);
        assert(ret.code == 0);

        await remote.execute('tx.create', [{"sendnow":true}, [{"value":50000000, "account": env.alice.name}]]);
        assert(ret.code == 0);
    });

    it('Bob请求Alice写推荐信，Alice收到请求，签发推荐信', async () => {
        console.log(`send recommendation to ${env.alice.address}`)
        await remote.execute('comm.notify', [
            env.alice.address,                                          //通知地址
            {type: 'recommendation', payload: env.bob.pubkey},          //content
            env.bob.name,                                               //发送账号
        ]);

        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
    });

    it('Bob发送推荐信给Eve', async () => {
        console.log(`send issue ${env.bob.erid[0]} to ${env.eve.address}`)
        await remote.execute('comm.notify', [
            env.eve.address,                                            //通知地址
            {type: 'issue', payload: env.bob.erid[0]},                  //content
            env.bob.name,                                               //发送账号
        ]);
    });
});
