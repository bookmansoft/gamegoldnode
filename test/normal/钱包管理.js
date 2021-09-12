/**
 * 联机单元测试：钱包管理
 */

const assert = require('assert')
const uuid = require('uuid/v1');
const gamegold = require('gamegold')
const Address = gamegold.address;
const digest = gamegold.crypto.digest;
const KeyRing = gamegold.keyring;

const connector = require('../lib/remote/connector')
const remote = connector();

//建立上下文对象
let env = {
    import: {},
    robin:  {id: uuid(), key:null, address:null},
};

describe('钱包管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }

        //生成密钥
        env.import.key = KeyRing.generate(false, 'testnet');
        env.import.prv = env.import.key.privateKey;
        env.import.pub = env.import.key.publicKey;
        env.import.addr = Address.fromWitnessPubkeyhash(digest.hash160(env.import.pub), 'testnet').toString();

        env.import.key1 = KeyRing.generate(false, 'testnet');
        env.import.prv1 = env.import.key1.privateKey;
        env.import.pub1 = env.import.key1.publicKey;
        env.import.addr1 = Address.fromWitnessPubkeyhash(digest.hash160(env.import.pub1), 'testnet').toString();

        //create a watch-only wallet to import pubkey and address
        ret = await remote.execute('wallet.create', [
            null,
            'pubkeyhash',       //Type of wallet (pubkeyhash, multisig) (default=pubkeyhash).
            1,                  //`m` value for multisig.
            1,                  //`n` value for multisig.
            null,               //mnemonic phrase to use to instantiate an hd private key for wallet
            null,               //passphrase to encrypt wallet
            null,               //Master HD key. If not present, it will be generated.
            true,               //Whether to use witness programs.
            true,               //set true to create a watch-only wallet
            null,               //public key used for multisig wallet
        ]);
        env.address = ret.id;
    });

    it('创建钱包：在钱包管理器中创建一个新钱包', async () => {
        //创建新钱包
        let msg = await remote.execute('wallet.create', [null, 'pubkeyhash', 1, 1]);
        env.robin.key = msg.account.accountKey;
        env.robin.address = msg.account.receiveAddress;
        env.robin.id = msg.id;

        //连接新钱包，查询余额
        remote.setup({type: 'testnet', id: env.robin.id});
        env.robin.amount = (await remote.execute('balance.all', [])).unconfirmed;
        //校验结果合理
        assert(env.robin.amount === 0);

        //连接老钱包
        remote.setup({type: 'testnet', id: 'primary'});
        //为新钱包归属地址转账
        await remote.execute('tx.send', [env.robin.address, 10000000]);

        //连接新钱包
        remote.setup({type: 'testnet', id: env.robin.id});
        //查询余额
        let amount = (await remote.execute('balance.all', [])).unconfirmed;
        //校验结果合理
        assert(amount , env.robin.amount + 10000000);

        //重新连接老钱包(恢复现场)
        remote.setup({type: 'testnet', id: 'primary'});
    });

    it('列表钱包：列表钱包管理器中的所有钱包', async () => {
        let msg = await remote.execute('wallet.list', []);
        assert(msg.indexOf('primary') >= 0);
        assert(msg.indexOf(env.robin.id) >= 0);
    });

    it('查询钱包：查询钱包概要说明', async () => {
        let msg = await remote.execute('wallet.info', [env.robin.id]);
        assert(!msg.error && msg.id == env.robin.id);
    });

    it('备份密钥：用助记符模式导出钱包密钥作为备份', async () => {
        //如下指令会在项目根目录下，导出名为'testnet.keystore'的文件，其中'testnet'为网络类型
        let msg = await remote.execute('wallet.exportmnemonic', ['bookmansoft']);
        assert(!msg.error);

        //可遵循如下步骤，使用导出的助记词备份来恢复钱包
        //1. 新建项目并完成节点初始化启动，也可以利用现有项目
        //2. 在项目根目录放置该助记词备份文件，保持文件名不变
        //3. 手动删除原有钱包库目录(如果存在的话): ./.gamegold/testnet/walletdb.ldb
        //4. 启动节点，注意启动时不要带'--genesis'参数，因为该参数指示重建创世区块，并为创世者设置专用钱包库
    });

    it('导出备份：从钱包管理器中导出钱包备份', async () => {
        let msg = await remote.execute('wallet.export', ['backup.txt']);
        assert(!msg.error && msg == true);
    });

    it('导入备份：将钱包备份导入钱包管理器', async () => {
        let msg = await remote.execute('wallet.import', ['backup.txt']);
        assert(!msg.error && msg == true);
    });

    it('根据输入地址，导出私钥', async () => {
        let ret = await remote.execute('key.export.private', [env.address]);
        assert(!ret.error);
        env.prvkey = ret;
    });

    it('根据输入地址，导出公钥', async () => {
        let ret = await remote.execute('key.export.public', [env.address]);
        assert(!ret.error);
    });

    it('导出根密钥和助记词', async () => {
        let ret = await remote.execute('key.master.admin', []);
        assert(!ret.error);
    });

    it('导入私钥', async () => {
        //普通钱包可以导入新的私钥
        let ret = await remote.execute('key.import.private', ['default', env.import.key.toSecret('testnet')]);
        assert(!ret.error); //当RPC函数返回NULL时，无法使用此种错误检测。因此需要避免在RPC函数中直接返回Null，可以替之以0或布尔值
    });

    it('导入公钥', async () => {
        //@note 只有watch-only钱包才可以导入公钥
        remote.setup({type: 'testnet', id: env.address});
        let ret = await remote.execute('key.import.public', ['default', env.import.pub.toString('hex')]);
        assert(!ret.error);
    });

    it('导入地址', async () => {
        //@note 只有watch-only钱包才可以导入地址
        let ret = await remote.execute('key.import.address', ['default', env.import.addr1]);
        assert(!ret.error);
    });
});
