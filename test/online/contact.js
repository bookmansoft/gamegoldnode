/**
 * 单元测试: GIP0023 安全通信
 * Creted by liub 2020.04.28
 */

const assert = require('assert');
const remote = (require('./connector'))({structured: true});

let env = {
    alice: {name: 'alice',},
    bob: {name: 'bob',},
};

describe.skip('GIP0027', function() {
    it('为Alice创建账号', async () => {
        let ret = await remote.execute('account.create', [{'name': env.alice.name},]);
        assert(ret.code == 0);

        ret = await remote.execute('address.create', [env.alice.name]);
        assert(ret.code == 0);
        env.alice.address = ret.result.address;

        await remote.execute('tx.send', [env.alice.address, 100000000]);
        await remote.execute('tx.send', [env.alice.address, 100000000]);
        await remote.execute('tx.send', [env.alice.address, 100000000]);
    });

    it('为Bob创建账号', async () => {
        let ret = await remote.execute('account.create', [{'name': env.bob.name},]);
        assert(ret.code == 0);

        ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;

        await remote.execute('tx.send', [env.bob.address, 100000000]);
        await remote.execute('tx.send', [env.bob.address, 100000000]);
        await remote.execute('tx.send', [env.bob.address, 100000000]);

        await remote.execute('miner.generate.admin', [1]);
    });

    it('Alice向Bob发送消息', async () => {
        let ret = await remote.execute('comm.secret', [
            env.alice.address,
            'hello',
            env.bob.name,
        ]);
        assert(ret.code == 0);
    });
});