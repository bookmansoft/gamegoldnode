/**
 * 可信区块链功能测试
 * 检验项目：
 *  (7). 非链上数据防篡改
 * 测试目的：验证系统的非链上数据防篡改能力，以及篡改数据的恢复机制
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    验证系统的非链上数据防篡改能力，以及篡改数据的恢复机制. 
    披露测试项设计思路，包括篡改的数据内容，发送交易情况，共识结果，以及对篡改数据的后续处理。演示验证：
    1. 篡改非链上数据 - 用户账户未确认余额
    2. 发起与篡改数据相关的交易 - 查询用户账户未确认余额
    3. 发起与篡改数据不相关的交易
 * 预期结果：
    披露内容详尽，测试结果与披露一致，演示结果符合预期：
    1. 与篡改数据相关交易，交易失败，并给出相应提示
    2. 与篡改数据不相关交易，交易成功，篡改数据不影响其他正常数据
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
    bob: {
        name: uuid(),
        address: '',
    },
    eve: {
        name: uuid(),
        address: '',
    },
}
//#endregion

describe('非链上数据防篡改', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    it('创建测试用账户', async () => {
        //使用SDK连接节点1，创建演示账户 Bob 和 Eve
        await remote.execute('account.create', [{name: env.bob.name}]);
        await remote.execute('account.create', [{name: env.eve.name}]);

        let ret = await remote.execute('address.receive', [env.eve.name]);
        assert(!ret.error);
        env.eve.address = ret.result;

        ret = await remote.execute('address.receive', [env.bob.name]);
        assert(!ret.error);
        env.bob.address = ret.result;
    });

    it('查询Eve账户的余额：0', async () => {
        //连接节点1，查询Eve账户余额(unconfirmed)
        let ret = await remote.execute('balance.unconfirmed', [env.eve.name]);
        assert(!ret.error);
        assert(ret.result == 0);
    });

    it('修改非链上数据，改变Eve账户的余额：5', async () => {
        //连接节点1，使用模拟指令，修改Eve账户余额(unconfirmed)
        let ret = await remote.execute('account.virtualadd.admin', [env.eve.name, 500000000]);
        assert(!ret.error);
    });

    it('查询Eve账户的余额：5', async () => {
        //连接节点1，查询Eve账户余额(unconfirmed)，显示为被篡改值
        ret = await remote.execute('balance.unconfirmed', [env.eve.name]);
        assert(!ret.error);
        assert(ret.result == 5);
    });

    it('从改变的Eve账户向外部转账：失败', async () => {
        //连接节点1，使用Eve账户发起一笔交易
        let ret = await remote.execute('tx.send', [env.eve.address, 10000000 , env.eve.name]);
        //断言失败
        assert(!!ret.error);
    });

    it('从正常账户向外部转账：成功', async () => {
        //连接节点1，使用正常账户发起一笔交易
        let ret = await remote.execute('tx.send', [env.bob.address, 10000000]);
        //断言成功
        assert(!ret.error);
    });

    it('验证并修复非链上数据，恢复Eve账户的正常余额', async () => {
        //连接节点1，发起指令调用，验证修复Eve账户数据
        let ret = await remote.execute('account.checkamount', [env.eve.name]);
        assert(!ret.error);
    });

    it('查询Eve账户的余额：0', async () => {
        //连接节点1，查询并打印Eve账户余额(unconfirmed)，发现是正确的数值
        ret = await remote.execute('balance.unconfirmed', [env.eve.name]);
        assert(!ret.error);
        assert(ret.result == 0);
    });
});