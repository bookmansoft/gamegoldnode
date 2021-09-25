/**
 * 可信区块链功能测试
 * 检验项目：
 *  (37). 基于软件方案的私钥管理
 * 测试目的：
 *  验证基于软件方案的产品具备私钥管理的能力，披露软件层面的私钥管理方案（提供私钥托管服务）
 *  以及交易签名策略（Server端签署）
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.注册用户，申请私钥，并查看私钥申请结果，及存储信息
    2.该用户发起交易
    注：禁止私钥明文传输，及明文存储
 * 预期结果：
    交易签名验签成功，交易正常执行
 */

//#region 引入SDK
const assert = require('assert');
const uuid = require('uuid/v1');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {
        name: uuid(),
        address: '',
    },
    utxo: {},
    address: null,
}
//#endregion

describe('基于软件方案的私钥管理', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    after(()=>{
        remote.close();
    });

    it('Alice注册用户账户', async () => {
        //连接节点1，为Alice申请账户
        let ret = await remote.execute('account.create', [{name: env.alice.name}]);
        assert(!ret.error);
        console.log(`Alice成功注册新账号: ${env.alice.name}`);
    });

    it('Alice申请私钥，系统返回该私钥对应地址', async () => {
        //连接节点1，为Alice申请一个新的私钥及对应地址
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.result.address;
        console.log(`Alice获得了新地址: ${env.alice.address}`);

        ret = await remote.execute('address.create', []);
        assert(!ret.error);
        env.address = ret.result.address;
    });

    it('向Alice的新地址转账', async () => {
        //连接节点1，向Alice的新地址转账
        let ret = await remote.execute('tx.send', [env.alice.address, 100000000]);
        assert(!ret.error);
        console.log('Alice得到新的UTXO');
        console.log('-hash:', ret.result.hash); //此处虽然返回参数名为hash，其实却是txid
        console.log('-index:', 0);
        console.log('-value:', ret.result.outputs[0].value);

        env.utxo.txid = ret.result.hash;
        env.utxo.vout = 0;

        await remote.execute('miner.generate.admin', [1]);

        //连接节点1，查询Alice账户余额，显示金额已增加
        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        console.log(`Alice当前余额: ${ret.result}`);
    });

    it('Alice动用私钥花费该UTXO', async () => {
        //连接节点1，Alice动用私钥，花费先前得到的UTXO。注意私钥是托管在服务端，并由服务端代签
        let ret = await remote.execute('tx.create', [
            {'sendnow':true, in:[{hash: env.utxo.txid, index: env.utxo.vout}]}, 
            [{address: env.address, value: 99990000}]
        ]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);

        //连接节点1，查询Alice账户余额，显示金额已减少
        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        console.log(`Alice当前余额: ${ret.result}`);
    });
});
