/**
 * 可信区块链功能测试
 * 检验项目：
 *  (44). 节点证书权限管理方案
 * 测试目的：验证系统针对节点证书是否具有完备的权限管理方案，具备完善的证书管理体系
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.使用普通角色新增、吊销节点证书
    2.披露节点证书权限管理方案
    3.结合权限管理方案，进行新增、吊销节点证书操作，包括符合权限管理策略的新增、吊销，不符合权限管理策略的新增吊销两个场景
 * 预期结果：
    1.普通角色操作提示权限错误
    2.符合权限管理策略的新增、吊销，操作成功
    3.不符合权限管理策略的新增、吊销，操作失败，给出相应提示
 */

//#region 引入SDK
const assert = require('assert');
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const uuid = require('uuid/v1')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
const remoteOperator = connector({
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {account: uuid(),};
//#endregion

describe('节点证书权限管理方案', () => {
    before(async () => {
        await remote.execute('sys.devmode', [false]);

        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret[0].height]);
        }
        await remote.wait(500);
    });

    it('系统管理员为普通用户分配访问令牌', async () => {
        //连接节点1，系统管理员执行指令，为普通用户分配令牌
        let ret = await remote.execute('sys.createAuthToken', [env.account]);
        //解密得到令牌明文，分配给普通用户
        env.token = remote.decryptToken(ret[0].encry);

        //普通用户使用令牌信息设置连接器属性
        remoteOperator.setup({
            type: 'testnet', 
            cid: env.account, 
            token: env.token,
        });

        console.log(`为普通用户设置访问令牌:`);
        console.log(`  id: ${env.account} token: ${env.token}`);
    });

    it('不符合权限管理策略的操作', async () => {
        //连接节点2，普通用户试图生成节点证书
        console.log(`普通用户新增节点${notes[1].name}证书: 失败`);
        let ret = await remoteOperator.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        //断言操作失败，因为普通用户无权执行生成证书操作
        assert(!!ret.error);
        //打印错误信息
        console.log(ret.error);
    });

    it('符合权限管理策略的操作', async () => {
        //连接节点1，系统管理员试图生成节点证书
        console.log(`系统管理员新增节点${notes[1].name}证书: 成功`);
        let ret = await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        //断言操作成功
        assert(!ret.error);
    });

    it('符合权限管理策略的操作', async () => {
        //连接节点1，系统管理员试图再次生成节点证书
        console.log(`系统管理员新增节点${notes[2].name}证书: 成功`);
        let ret = await remote.execute('sys.aliance.create', ['bookmansoft', notes[2].id, notes[2].aliance, `${notes[2].inner}:${notes[2].tcp}`]);
        //断言操作成功
        assert(!ret.error);
    });

    it('不符合权限管理策略的操作', async () => {
        //连接节点2，普通用户试图吊销指定节点证书
        console.log(`普通用户吊销节点${notes[1].name}证书: 失败`);
        let ret = await remoteOperator.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        //断言操作失败，因为普通用户无权执行吊销证书操作
        assert(!!ret.error);
        //打印错误信息
        console.log(ret.error);
    });

    it('符合权限管理策略的操作', async () => {
        //连接节点1，系统管理员试图吊销指定节点证书
        console.log(`系统管理员吊销节点${notes[1].name}证书: 成功`);
        let ret = await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        //断言操作成功
        assert(!ret.error);
        await remote.wait(10000);
    });

    it('查看节点证书列表', async () => {
        //连接节点1，系统管理员查询并打印证书列表
        let ret = await remote.execute('sys.aliance.list', []);
        assert(!ret.error);
        console.log(ret.map(it=>{
            return {
                name: it.name,
                id: it.id,
                address: it.address,
                host: it.host,
                voted: false,
            };
        }));

        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(2000);
        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(2000);
    });
});
