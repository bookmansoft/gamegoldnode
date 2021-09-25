/**
 * 可信区块链功能测试
 * 检验项目：
 *  (21). 智能合约升级
 * 测试目的：
 *  验证区块链平台的智能合约是否支持升级
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.部署合约
    2.启动智能合约升级
    3.发送交易调用新智能合约
    4.发送交易调用旧智能合约
 * 预期结果：
    1.合约版本匹配，交易成功
    2.合约本本不匹配，交易失败
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    contract: {},
};
//#endregion

describe('智能合约升级', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('选取模板，建立一个智能合约实例', async () => {
        //连接节点1，选定合约模板、注册合约，当前合约版本为1
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
        //连接节点1，升级合约，合约版本变更为2
        await remote.execute('sc.register', [
            {oper: 'update', dst: env.contract.address, type: 'example'},
        ]);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(5000);

        //连接节点1，查询并打印该合约当前版本
        let ret = await remote.execute('sc.query', [[['options.dst', env.contract.address]]]);
        console.log(`合约${ret.list[0].options.dst}成功升级至: ${ret.list[0].options.ver}`);
    });

    it('执行新版智能合约：成功', async () =>{
        //连接节点1，执行该合约，指定版本号为2
        console.log(`执行合约${env.contract.address}的V2版本`);
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {ver: 2},
        ]);
        //断言操作成功
        assert(!ret.error);

        //将上述交易上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });

    it('执行旧版智能合约：失败', async () => {
        //连接节点1，执行该合约，指定版本号为1
        console.log(`执行合约${env.contract.address}的V1版本`);
        let ret = await remote.execute('sc.run', [
            `${env.contract.address},50000`,
            {ver: 1},
        ]);
        //断言操作失败，因为指定版本号已陈旧
        assert(!!ret.error);
        //打印错误信息
        console.log(ret.error);
    });
});
