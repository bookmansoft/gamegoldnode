/**
 * 联机单元测试：智能合约部署多方确认
 * @description
    验证智能合约治理过程是否支持多方确认
    1.指定的组织管理员上传智能合约包，并选择相应的区块链网络来执行安装合约操作
    2.该区块链网络中其他组织的管理员能收到前述安装合约的通知消息，其他组织管理员可以审核并同意安装该智能合约
    3.合约部署管理策略中指定的所有管理员同意安装该智能合约之后，任一管理员可提交智能合约确认安装，最终完成智能合约的安装
    4.成功调用已安装的合约
    
    预期结果
    1.智能合约经网络中相关的各组织确认后，可成功安装，用户可成功调用智能合约
 */

const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common');
//引入核心库，在包引入模式下直接使用 require('gamegold')
const gamegold = require('gamegold');
const consensus = gamegold.consensus;

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
const remote1 = connector({
    ip: notes[1].ip,        //RPC地址
    port: notes[1].rpc,    //RPC端口
});

let env = {
    contract: {},
};

describe('智能合约部署多方确认', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);

        //连接节点1，设置长连模式，并订阅指定消息
        remote1.setmode(remote.CommMode.ws, async () => {});
        let event = 'sc/publish';
        await remote1.watch(async msg => {
            console.log(`节点1收到公共合约的安装通告`, JSON.stringify(msg));
            let ret = await remote1.execute('oracle.send', [`sc.${msg.dst}`, JSON.stringify({consensus: 1}), 500000000]);
            assert(!ret.error);
            console.log(`节点1开始投票...`);

            await remote.execute('miner.generate.admin', [1]);
        }, event).execute('subscribe', [event]);
    });

    after(() => {
        remote.close();
        remote1.close();
    });

    it('选取模板，建立一个公共服务类合约实例', async () => {
        console.log(`节点0安装一个公共合约`);
        let ret = await remote.execute('sc.register', [
            {type: 'example', cls: 'publish'},
        ]);
        assert(ret.dst);
        //设置合约地址
        env.contract.address = ret.dst;

        //上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });

    it('查询公共服务列表，上述合约尚未上榜', async () => {
        let ret = await remote.execute('sc.query', [[['options.dst', env.contract.address]]]);
        assert(ret.list.length == 1);
        console.log(ret.list[0].options);
        console.log(`节点0查询该合约状态，发现尚未达成共识`);
    });

    it('管理员的投票结果经过一个投票周期后形成共识', async () => {
        await remote.execute('miner.generate.admin', [consensus.retargetInterval]);
        await remote.wait(1000);

        let ret = await remote.execute('sc.query', [[['options.dst', env.contract.address], ['options.consensus', 1]]]);
        assert(ret.list.length == 1);
        console.log(ret.list[0].options);
        console.log(`经过一个投票周期，节点0再次查询该合约状态，发现达成共识`);
    });

    it('查询公共服务列表，选取上榜合约，调用执行：成功', async () => {
        let ret = await remote1.execute('sc.run', [
            `${env.contract.address},50000`,
            {},
        ]);
        assert(!ret.error);
        console.log(`节点1调用合约，执行成功`);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });
});