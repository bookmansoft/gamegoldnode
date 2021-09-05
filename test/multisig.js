/**
 * 联机单元测试：利用托管合约实现多签业务
 */

const assert = require('assert')
const remote = (require('../lib/remote/connector'))();

//声明中间环境变量
let env = {
    address:{},
    accountKey:{},
};

describe.skip('利用托管合约实现多签流程', () => {
    it('Alice建立本地账户', async () => {
        //生成自己的账户
        await remote.execute('account.create', [{'name':'alice'}]);

        //创建本地多签钱包
        let msg = await remote.execute('wallet.create', ['alice','multisig',2,2,,,,true]);
        assert(msg.account.accountKey);
        env.address['alice'] = msg.id;
        env.accountKey['alice'] = msg.account.accountKey;
    });

    it('Bob建立本地账户', async () => {
        //生成自己的账户
        await remote.execute('account.create', [{'name':'bob'}]);

        //创建本地多签钱包
        let msg = await remote.execute('wallet.create', ['bob','multisig',2,2,,,,true]);
        assert(msg.account.accountKey);
        env.address['bob'] = msg.id;
        env.accountKey['bob'] = msg.account.accountKey;
    });

    it('第三方伙伴Robin建立本地账户', async () => {
        //生成自己的账户
        await remote.execute('account.create', [{'name':'robin'}]);
        //生成新地址, 该地址既是多签钱包的标识，也是多签合约中Bob的通信地址
        let msg = await remote.execute('address.create', ['robin']);
        assert(msg.address);
        env.address['robin'] = msg.address;

        msg = await remote.execute('balance.all', ['robin']);
        env.balance = msg.confirmed;
    });

    it('为Alice和Bob储值', async () => {
        //系统转账
        await remote.execute('tx.send', [env.address['alice'], 500000000]);
        await remote.execute('tx.send', [env.address['alice'], 500000000]);
        await remote.execute('tx.send', [env.address['bob'], 500000000]);
        await remote.execute('tx.send', [env.address['bob'], 500000000]);
        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('Alice建立一个 2/2 多签合约实例', async () => {
        //注册合约
        let msg = await remote.execute('sc.register', [{'type':'multisig', 'm':2, 'n':2}], 'alice');
        assert(msg.dst);
        //设置合约地址
        env.address['contract'] = msg.dst;
        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('Alice和Bob分别上传自己的公钥', async () =>{
        //Alice构造合约驱动交易，上传钱包公钥和通信地址
        await remote.execute('sc.run', [
            `${env.address['contract']},50000`,
            {'oper': 'pubk', 'pubk': env.accountKey['alice'], 'addr': env.address['alice']},
            'alice',
        ]);

        //Bob构造合约驱动交易，上传钱包公钥和通信地址
        await remote.execute('sc.run', [
            `${env.address['contract']},50000`,
            {'oper': 'pubk', 'pubk': env.accountKey['bob'], 'addr': env.address['bob']},
            'bob',
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

    it('多签地址收款，Alice和Bob的多签钱包将收到对应UTXO', async () => {
        //第三方转账
        await remote.execute('tx.send', [env.address['multisig'], 250000000]);
        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('Alice通过多签钱包向Robin转账', async () => {
        //Alice利用多签钱包，构造一笔向Robin转账的多签交易
        let msg = await remote.setup({type: 'testnet', id: env.address['alice']}).execute('tx.create', [
            {'rate':10000,'sendnow':false}, 
            [
                {'value':100000000,'address':env.address['robin']},
                {'value':100000000,'address':env.address['robin']},
            ],
        ]);
        assert(msg.hex);
        env.trans = msg.hex;

        //Alice发送合约驱动交易，征集门限签名
        await remote.setup({type: 'testnet', id: 'primary'}).execute('sc.run', [
            `${env.address['contract']},20000`,
            {'oper':'sign','tx':env.trans,'addr':env.address['alice']},
            'alice',
        ]);

        //此时由于未达门限要求，Robin尚未收到转账
        msg = await remote.execute('balance.all', ['robin']);
        assert(msg.confirmed - env.balance == 0);

        //上链，触发 mssendtx/receive 事件
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('Bob查询多签交易列表，逐项补签后广播，Robin收到款项', async () => {
        console.log(env.address);

        let list = await remote.execute('tx.mstrans', []);
        for(let trans of list) {
            await remote.execute('tx.mstrans.sign', [trans.txid, 'bob']);
        }

        //上链，Robin收到已确认的UTXO
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);

        //Robin最终收到转账
        msg = await remote.execute('balance.all', ['robin']);
        //console.log(msg.confirmed, env.balance);
        assert(msg.confirmed - env.balance == 200000000);
    });
});
