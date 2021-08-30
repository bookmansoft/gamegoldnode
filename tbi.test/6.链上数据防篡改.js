/**
 * 联机单元测试：链上数据防篡改
 * @description
    验证系统的数据防篡改能力，以及篡改数据的恢复机制
    披露测试项设计思路，包括篡改的数据内容，发送交易情况，共识结果，以及对篡改数据的后续处理。演示验证：
    1.篡改链上数据：修改账户余额
    2.发起与篡改数据相关的交易：从篡改账户向外转账
    3.发起与篡改数据不相关的交易：发送者、接收者均为非篡改账户
    4.验证并修复账户余额

    演示预期结果：篡改数据不影响新增相关交易，具体如下：
    1、与篡改数据相关交易，执行失败，并给出相应提示
    2、与篡改数据不相关交易，交易成功（不具备全局状态空间校验能力）
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')
const uuid = require('uuid/v1')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

let env = {
    alice: {
        name: uuid(),
        address: '',
    },
    bob: {
        name: uuid(),
        address: '',
    },
    eve: {
        name: uuid(),
        address: '',
    },
}

describe('链上数据防篡改', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        await remote.wait(500);
    });

    it('创建Alice账户', async () => {
        await remote.execute('account.create', [{name: env.alice.name}]);
        await remote.execute('account.create', [{name: env.bob.name}]);
        await remote.execute('account.create', [{name: env.eve.name}]);

        let ret = await remote.execute('address.receive', [env.eve.name]);
        assert(!ret.error);
        env.eve.address = ret.result;
    });

    it('查询Alice账户的余额：0', async () => {
        let ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        assert(!ret.error);
        assert(ret.result == 0);
    });

    it('篡改Alice账户的余额：5', async () => {
        let ret = await remote.execute('account.virtualadd.admin', [env.alice.name, 500000000]);
        assert(!ret.error);
    });

    it('查询Alice账户的余额：5', async () => {
        ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        assert(!ret.error);
        assert(ret.result == 5);
    });

    it('从篡改的Alice账户向外部转账：失败', async () => {
        let ret = await remote.execute('tx.send', [env.eve.address, 100000000 , env.alice.name]);
        assert(!!ret.error);
    });

    it('从正常账户向外部转账：成功', async () => {
        let ret = await remote.execute('tx.send', [env.eve.address, 100000000]);
        assert(!ret.error);
    });

    it('验证并修复Alice账户的余额', async () => {
        let ret = await remote.execute('account.checkamount', [env.alice.name]);
        assert(!ret.error);
    });

    it('查询Alice账户的余额：0', async () => {
        ret = await remote.execute('balance.unconfirmed', [env.alice.name]);
        assert(!ret.error);
        assert(ret.result == 0);
    });
});
