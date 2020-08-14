/**
 * 联机单元测试：多签合约 - 利用托管合约实现多签合约流程
 */

const assert = require('assert')
const uuidv1 = require('uuid/v1');
const remote = (require('../test/online/connector'))();

//声明中间环境变量
let env = {
    alice: uuidv1(),
    bob: uuidv1(),
    robin: uuidv1(),
    address:{},
    accountKey:{},
};

describe('多签合约 - 利用托管合约实现多签合约流程', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('创建多签钱包：Alice创建多签钱包', async () => {
        //Alice创建多签钱包
        let msg = await remote.execute('wallet.create', [env.alice,'multisig',2,2,,,,true]);
        console.log(`multisig wallet of alice:`, msg.wid, msg.id);
        assert(msg.account.accountKey);
        env.address[env.alice] = msg.id;
        env.accountKey[env.alice] = msg.account.accountKey;
    });

    it('创建多签钱包：Bob创建多签钱包', async () => {
        //创建本地多签钱包
        let msg = await remote.execute('wallet.create', [env.bob,'multisig',2,2,,,,true]);
        console.log('multisig wallet of bob:', msg.wid, msg.id);
        assert(msg.account.accountKey);
        env.address[env.bob] = msg.id;
        env.accountKey[env.bob] = msg.account.accountKey;
    });

    it('创建账户：第三方伙伴Robin建立账户', async () => {
        let msg = await remote.execute('address.create', [env.robin]);
        assert(msg.address);
        env.address[env.robin] = msg.address;

        msg = await remote.execute('balance.all', [env.robin]);
        env.balance = msg.confirmed;
    });

    it('转账交易：为Alice和Bob储值', async () => {
        //系统转账
        await remote.execute('tx.send', [env.address[env.alice], 200000000]);
        await remote.execute('tx.send', [env.address[env.alice], 200000000]);
        await remote.execute('tx.send', [env.address[env.alice], 200000000]);
        await remote.execute('tx.send', [env.address[env.bob], 200000000]);
        await remote.execute('tx.send', [env.address[env.bob], 200000000]);
        await remote.execute('tx.send', [env.address[env.bob], 200000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('创建多签合约：Alice建立一个多签合约实例', async () => {
        //注册合约
        let msg = await remote.execute('sc.register', [{'type':'multisig', 'm':2, 'n':2}], env.alice);
        assert(msg.dst);
        //设置合约地址
        env.address['contract'] = msg.dst;
        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('共建多签合约：多方分别上传自己的公钥', async () =>{
        //Alice构造合约驱动交易，上传钱包公钥和通信地址
        await remote.execute('sc.run', [
            `${env.address['contract']},50000`,
            {'oper': 'pubk', 'pubk': env.accountKey[env.alice], 'addr': env.address[env.alice]},
            env.alice,
        ]);

        //Bob构造合约驱动交易，上传钱包公钥和通信地址
        await remote.execute('sc.run', [
            `${env.address['contract']},50000`,
            {'oper': 'pubk', 'pubk': env.accountKey[env.bob], 'addr': env.address[env.bob]},
            env.bob,
        ]);

        //将上述交易上链，触发 mssendpubk/receive 事件，钱包自动生成并广播新的交易：上传生成的多签地址
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
        
        //将钱包广播的新交易上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);

        //查询并记录多签收款地址
        let msg = await remote.execute('sc.query', [[['options.type','multisig'],['options.dst',env.address['contract']]]]);
        assert(msg.list[0].options.puba);
        env.address['multisig'] = msg.list[0].options.puba;
    });

    it('转账交易：公布多签地址，第三方向该地址转账，Alice和Bob的多签钱包将收到对应UTXO', async () => {
        await remote.execute('tx.send', [env.address['multisig'], 250000000]);
        await remote.execute('miner.generate.admin', [1]);
    });

    it('主动运行多签合约：Alice动用多签钱包向Robin转账', async () => {
        //Alice动用多签钱包，构造一笔向Robin转账的多签交易
        //2020.08.05 注意此处暴露了一个严重的安全问题：缺乏钱包访问控制机制，用户被授权连接后，可任意指定待操控钱包
        //一种简便易行的方案: 限定用户创建钱包时，只能使用自己名下的地址作为索引，在访问特定钱包时添加地址归属检测
        remote.setup({type: 'testnet', id: env.address[env.alice]});
        let msg = await remote.execute('tx.create', [
            {'rate':10000, 'sendnow':false}, 
            [
                {'value':100000000,'address':env.address[env.robin]},
                {'value':100000000,'address':env.address[env.robin]},
            ],
        ]);
        assert(msg.hex);
        env.trans = msg.hex;

        //Alice动用普通钱包发送合约驱动交易，征集门限签名
        remote.setup({type: 'testnet', id: 'primary'});
        await remote.execute('sc.run', [
            `${env.address['contract']},20000`,
            {'oper':'sign','tx':env.trans,'addr':env.address[env.alice]},
            env.alice,
        ]);

        //此时由于未达门限要求，Robin尚未收到转账
        msg = await remote.execute('balance.all', [env.robin]);
        assert(msg.confirmed - env.balance == 0);

        //上链，触发 mssendtx/receive 事件
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('辅助运行多签合约：多方分别查询多签交易列表，动用多签钱包逐项补签后广播，Robin收到款项', async () => {
        //todo 需要进一步用访问账号限定 tx.mstrans 返回的交易条目
        let msg = await remote.execute('tx.mstrans', [env.bob]);
        for(let trans of msg) {
            //tx.mstrans.sign 指令同时用到了多签钱包和普通钱包账户，需要检测多签钱包的归属
            await remote.execute('tx.mstrans.sign', [trans.txid, env.bob]);
        }

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);

        //Robin最终收到转账
        msg = await remote.execute('balance.all', [env.robin]);
        assert(msg.confirmed - env.balance == 200000000);
    });
});
