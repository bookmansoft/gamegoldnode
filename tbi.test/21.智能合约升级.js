/**
 * 联机单元测试：智能合约升级
 * @description
    验证区块链平台的智能合约是否支持升级
    1.部署合约
    2.启动智能合约升级
    3.发送交易调用新智能合约
    4.发送交易调用旧智能合约
    
    预期结果：
    1.交易成功
    2.交易失败或应用层提示
 */

const assert = require('assert');
const connector = require('../lib/remote/connector')
const {notes} = require('../lib/remote/common')

const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].port,    //RPC端口
});

let env = {
    contract: {},
};

describe('智能合约升级', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('选取模板，建立一个智能合约实例', async () => {
        //注册合约
        let ret = await remote.execute('sc.register', [
            {type: 'example',},
        ]);
        assert(!ret.error);
        assert(ret.dst);
        console.log(`发布合约成功: 地址 ${ret.dst} 版本: 1`);

        //设置合约地址
        env.contract.address = ret.dst;

        //上链
        await remote.execute('miner.generate.admin', [1]);
    });

    it('升级智能合约', async () =>{
        await remote.execute('sc.register', [
            {oper: 'update', dst: env.contract.address, type: 'example'},
        ]);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(5000);

        let ret = await remote.execute('sc.query', [[['options.dst', env.contract.address]]]);
        console.log(`合约${ret.list[0].options.dst}成功升级至: ${ret.list[0].options.ver}`);
    });

    it('执行新版智能合约：成功', async () =>{
        console.log(`执行合约${env.contract.address}的V2版本`);
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {ver: 2},
        ]);
        assert(!ret.error);

        //将上述交易上链，触发合约执行
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });

    it('执行旧版智能合约：失败', async () => {
        console.log(`执行合约${env.contract.address}的V1版本`);
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {ver: 1},
        ]);
        assert(!!ret.error);
        console.log(ret.error);
    });
});
