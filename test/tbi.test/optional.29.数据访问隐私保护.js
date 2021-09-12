/**
 * 联机单元测试：数据访问隐私保护
 * @description
    披露区块链系统数据访问隐私保护方案，如数据存储隔离，数据加密存储，数据访问权限管理等
    
    预期结果：展示结果与披露项一致
 */

const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')

//创建超级用户使用的连接器
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//创建普通用户使用的连接器
const remoteOperator = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

//中间环境变量
let env = {
    alice: {name: `Alice-${uuid()}`,},
    bob: {name: `Bob-${uuid()}`,},
    account: "oper-"+ uuid().slice(0,31), //生成随机的操作员账号
    amount: 100000000,
};


describe('链上数据存储方式', function() {
    after(()=>{
        remote.close();
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

        //设置长连模式
        remote.setmode(remote.CommMode.ws, async () => { });
        //设置事件处理句柄
        remote.watch(async msg => {
            console.log('[收到一个加密消息]');
            console.log(`发送:${msg.from}`);
            console.log(`接收:${msg.to}`);
            console.log(`内容:${msg.content}`);

            console.log('[查看链上消息记录]');
            let ret = await remote.execute('comm.listNotify', [[['body.dst', env.bob.address]]]);
            for(let item of ret.result.list) {
                if(!!item.body.content.packet) {
                    console.log(`发送:${item.body.src}`);
                    console.log(`接收:${item.body.dst}`);
                    console.log(`内容:${item.body.content.packet}`);
                    console.log(`序号:${item.sn}`);
                    console.log(`高度:${item.h}`);
                }
            }
        }, 'notify.secret');
    });

    it('发送加密消息：Alice发送消息给Bob', async () => {
        let ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;
        console.log(`Bob的收信地址: ${env.bob.address}`);

        //通讯握手，消息内容可设置为空
        await remote.execute('comm.secret', [
            env.bob.address,
            '',
            env.alice.name,
        ]);
        await remote.wait(1000);

        await remote.execute('comm.secret', [
            env.bob.address,
            `${env.bob.name}, 您好！`,
            env.alice.name,
        ]);
        await remote.wait(3000);
    });

    it('分配令牌：超级用户为普通用户映射账户并分配令牌', async () => {
        //超级用户执行指令，为普通用户分配令牌
        let ret = await remote.execute('sys.createAuthToken', [env.account]);
        //解密得到令牌明文，分配给普通用户
        env.opToken = remote.decryptToken(ret.result[0].encry);

        //普通用户使用令牌信息设置连接器属性
        remoteOperator.setup({
            type: 'testnet', 
            cid: env.account, 
            token: env.opToken,
        });
    });

    it('添加权限前：普通用户执行受限指令 - 失败', async () => {
        console.log(`生成地址`);
        let ret = await remoteOperator.execute('address.create', []);
        assert(ret.error);
        console.log(ret.error);
    });

    it('添加成员：超级用户将指定用户加入指定角色的成员列表', async () => {
        await remote.execute('sys.groupPrefix', [[['address', env.account]]]);
        await remote.execute('sys.groupSuffix', [[['admin', env.account]]]);
    });

    it('添加权限后：普通用户执行受限指令 - 成功', async () => {
        let ret = await remoteOperator.execute('address.create', []);
        assert(!ret.error);
        console.log(`生成地址:${ret.result.address}`);

        ret = await remoteOperator.execute('address.key.admin', [ret.result.address]);
        assert(!ret.error);
        console.log(`查询私钥:${ret.result.privateKey}`);
    });

    it('移除成员：超级用户将指定用户移出指定角色的成员列表', async () => {
        await remote.execute('sys.groupPrefix', [[['address', env.account]], true]);
        await remote.execute('sys.groupSuffix', [[['admin', env.account]], true]);
    });

    it('移除权限后：普通用户执行受限指令 - 失败', async () => {
        console.log(`生成地址`);
        let ret = await remoteOperator.execute('address.create', []);
        assert(!!ret.error);
        console.log(ret.error);
    });
});