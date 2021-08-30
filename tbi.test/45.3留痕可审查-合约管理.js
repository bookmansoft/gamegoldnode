/**
 * 联机单元测试：留痕可审查
 * @description
    验证产品具有留痕可审计能力
    1.关键行为留痕可审计，关键行为包括但不限于：
        节点管理行为（加入、退出、升级等）
        用户管理行为（新增、删除、冻结、解冻等）
        合约管理（部署、升级、调用、销毁等）
    2.依披露依次演示验证，包括节点管理、用户管理、合约管理三个场景
    
    预期结果：披露信息完整，演示与披露一致，关键操作均有留痕。
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

let env = {
    contract: {},
}

describe('留痕可审查-合约管理', () => {
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

    // it('注册合约', async () => {
    //     let ret = await remote.execute('sc.register', [
    //         {type: 'example',},
    //     ]);
    //     env.contract.address = ret.result.dst;

    //     await remote.execute('miner.generate.admin', [1]);
    //     await remote.wait(2000);
    // });

    // it('冻结合约', async () => {
    //     await remote.execute('sc.register', [
    //         {oper: 'change', dst: env.contract.address, state: 2},
    //     ]);

    //     await remote.execute('miner.generate.admin', [1]);
    //     await remote.wait(2000);
    // });

    // it('解冻合约', async () => {
    //     await remote.execute('sc.register', [
    //         {oper: 'change', dst: env.contract.address, state: 1},
    //     ]);

    //     await remote.execute('miner.generate.admin', [1]);
    //     await remote.wait(2000);
    // });

    // it('升级合约', async () => {
    //     await remote.execute('sc.register', [
    //         {oper: 'update', dst: env.contract.address, type: 'example'},
    //     ]);

    //     await remote.execute('miner.generate.admin', [1]);
    //     await remote.wait(2000);
    // });

    // it('执行合约', async () => {
    //     await remote.execute('sc.run', [
    //         `${env.contract.address},50000`,
    //         {ver: 2},
    //     ]);

    //     await remote.execute('miner.generate.admin', [1]);
    //     await remote.wait(2000);
    // });

    // it('销毁合约', async () => {
    //     await remote.execute('sc.register', [
    //         {oper: 'change', dst: env.contract.address, state: 3},
    //     ]);

    //     await remote.execute('miner.generate.admin', [1]);
    //     await remote.wait(2000);
    // });

    it('查询合约管理操作审计日志', async () => {
        let ret = await remote.execute('sys.log', [[['oper','scRegister']]]);
        assert(!ret.error);

        console.log(ret.result);

        ret = await remote.execute('sys.log', [[['oper','scState']]]);
        assert(!ret.error);

        console.log(ret.result);

        ret = await remote.execute('sys.log', [[['oper','scUpdate']]]);
        assert(!ret.error);

        console.log(ret.result);

        ret = await remote.execute('sys.log', [[['oper','scrun']]]);
        assert(!ret.error);

        console.log(ret.result);
    });
});
