/**
 * 可信区块链功能测试
 * 检验项目：
 *  (6). 链上数据防篡改
 * 测试目的：
 *  验证系统的数据防篡改能力，以及篡改数据的恢复机制
 * 前置条件：
 *  确保各节点稳定运行
 * 测试流程：
    1.篡改链上数据：修改账户余额
    2.发起与篡改数据相关的交易：从篡改账户向外转账
    3.发起与篡改数据不相关的交易：发送者、接收者均为非篡改账户
    4.验证并修复账户余额
 * 预期结果：
    1、与篡改数据相关交易，执行失败，并给出相应提示
    2、与篡改数据不相关交易，交易成功(UTXO模型)
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const uuid = require('uuid/v1')
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
    eve: {
        name: uuid(),
        address: '',
    },
}
//#endregion

describe('链上数据防篡改', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    it('创建Alice账户', async () => {
        //通过SDK连接节点1并发起指令调用，准备演示账户数据
        await remote.execute('account.create', [{name: env.alice.name}]);
        await remote.execute('account.create', [{name: env.eve.name}]);

        let ret = await remote.execute('address.receive', [env.eve.name]);
        assert(!ret.error);
        env.eve.address = ret.result;
    });

    it('查询Alice账户的余额：0', async () => {
        //通过SDK连接节点1，查询Alice账户余额
        let ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        assert(ret.result == 0);
    });

    it('篡改Alice账户的余额：5', async () => {
        //通过SDK连接节点1，调用模拟指令，篡改Alice账户余额
        let ret = await remote.execute('account.virtualadd.admin', [env.alice.name, 500000000]);
        assert(!ret.error);
    });

    it('查询Alice账户的余额：5', async () => {
        //通过SDK连接节点1，查询Alice账户当前余额(confirmed)
        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        assert(ret.result == 5);
    });

    it('从篡改的Alice账户向外部转账：失败', async () => {
        //通过SDK连接节点1，从Alice向Eve账户转账
        let ret = await remote.execute('tx.send', [env.eve.address, 10000000, env.alice.name]);
        //断言交易失败(Alice账户上并没有真正的余额)
        assert(!!ret.error);
    });

    it('从正常账户向外部转账：成功', async () => {
        //通过SDK连接节点1，从正常状态的账户向Eve账户转账
        let ret = await remote.execute('tx.send', [env.eve.address, 10000000]);
        //断言交易成功
        assert(!ret.error);
    });

    it('验证并修复Alice账户的余额', async () => {
        //通过SDK连接节点1并执行指令，检查修复Alice账户的状态
        let ret = await remote.execute('account.checkamount', [env.alice.name]);
        assert(!ret.error);
    });

    it('查询Alice账户的余额：0', async () => {
        //通过SDK连接节点1，查询Alice账户的当前余额
        ret = await remote.execute('balance.confirmed', [env.alice.name]);
        assert(!ret.error);
        //断言Alice账户余额为0
        assert(ret.result == 0);
    });
});
