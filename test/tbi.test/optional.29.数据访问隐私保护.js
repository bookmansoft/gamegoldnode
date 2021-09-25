/**
 * 可信区块链功能测试
 * 检验项目：
 *  (29). 数据访问隐私保护
 * 测试目的：
 *  披露区块链系统数据访问隐私保护方案
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
 *  1. 数据存储隔离
 *  2. 数据加密存储
 *  3. 数据访问权限管理
 * 预期结果：展示结果与披露项一致
 */

//#region 引入SDK
const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
const exec = require('child_process').exec; 
let net_main = null;
//#endregion

//#region 生成远程连接组件
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
const remoteOperator = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
const remoteClone = connector({
    structured: true,
    type: 'main',
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {name: `Alice-${uuid()}`,},
    bob: {name: `Bob-${uuid()}`,},
    account: "oper-"+ uuid().slice(0,31), //生成随机的操作员账号
    amount: 100000000,
};
//#endregion

describe('数据访问隐私保护', function() {
    after(()=>{
        remote.close();
        remoteOperator.close();
        remoteClone.close();
    });

    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        for(let i = 0; i < 2; i++) {
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":20000000, "account": env.alice.name}]]);
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":20000000, "account": env.bob.name}]]);
        }
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
    });

    it('数据存储隔离', async () => {
       //启动一个进程，运行一个新的节点，可以观测到，新的节点所有数据独立保存在 /clone 目录下
       net_main = exec(`node index.js --network=main --prefix=~/.gamegold/clone`, function(err, stdout, stderr) {
        if(err) {
            console.log(stderr);
        }
      });
      net_main.on('exit', () => { });
      await remoteClone.wait(3000);
      await remoteClone.execute('sys.stop.admin', []);
      await remoteClone.wait(6000);
    });

    it('数据加密存储', async () => {
        //连接节点1，使用指定密码加密钱包
        let ret = await remoteA.execute('wallet.encrypt', ['hello']);
        assert(!ret.error);

        //查询并打印处于加密状态的钱包主私钥
        ret = await remoteA.execute('key.master.admin', []);
        assert(!ret.error);
        console.log(ret.result);

        //执行一笔转账交易
        ret = await remoteA.execute('address.create', []);
        env.address = ret.result.address;
        ret = await remoteA.execute('tx.send', [ret.result.address, 1000000]);
        //断言失败，因为钱包处于加密状态
        assert(!!ret.error);

        //执行钱包永久解锁操作，必须使用加密时相同的密码
        ret = await remoteA.execute('wallet.decrypt', ['hello']);
        assert(!ret.error);

        //执行一笔转账交易
        ret = await remoteA.execute('address.create', []);
        env.address = ret.result.address;
        ret = await remoteA.execute('tx.send', [ret.result.address, 1000000]);
        //断言操作成功
        assert(!ret.error);

        //连接节点1，查询并打印处于解密状态的钱包主私钥
        ret = await remoteA.execute('key.master.admin', []);
        assert(!ret.error);
        console.log(ret.result);
    });

    it('数据访问权限管理', async () => {
        //系统管理员使用SDK连接节点1，为普通用户分配令牌
        let ret = await remote.execute('sys.createAuthToken', [env.account]);
        //解密得到令牌明文，分配给普通用户
        env.opToken = remote.decryptToken(ret.result[0].encry);

        //普通用户使用令牌信息设置连接器属性，连接节点1，执行受限指令失败(添加权限前)
        remoteOperator.setup({
            type: 'testnet', 
            cid: env.account, 
            token: env.opToken,
        });
        ret = await remoteOperator.execute('address.create', []);
        assert(ret.error);
        console.log(ret.error);

        //系统管理员连接节点1，为普通用户分配权限
        await remote.execute('sys.groupPrefix', [[['address', env.account]]]);
        await remote.execute('sys.groupSuffix', [[['admin', env.account]]]);

        //普通用户连接节点1，执行受限指令成功(添加权限后)
        ret = await remoteOperator.execute('address.create', []);
        assert(!ret.error);
        console.log(`生成地址:${ret.result.address}`);
        ret = await remoteOperator.execute('address.key.admin', [ret.result.address]);
        assert(!ret.error);
        console.log(`查询私钥:${ret.result.privateKey}`);

        //系统管理员连接节点1，移除普通用户相关权限
        await remote.execute('sys.groupPrefix', [[['address', env.account]], true]);
        await remote.execute('sys.groupSuffix', [[['admin', env.account]], true]);

        //普通用户连接节点1，执行受限指令失败(已被移除权限)
        ret = await remoteOperator.execute('address.create', []);
        assert(!!ret.error);
        console.log(ret.error);
    });
});