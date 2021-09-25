/**
 * 可信区块链功能测试
 * 检验项目：
 *  (42). 动态吊销节点证书
 * 测试目的：验证系统能吊销某节点证书，具备完善的证书管理体系
 * 前置条件：
 *  部署1、2、3、4共四个节点，确保其稳定运行
 * 测试流程：
    1.正常节点发送交易
    2.吊销该节点证书
    3.被吊销节点再次发送交易
 * 预期结果：
    1.正常节点发送交易，执行成功
    2.吊销后节点发送交易，执行中断，并给出相应提示
 */

//#region 引入SDK
const assert = require('assert')
const uuid = require('uuid/v1')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remote = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});

const remote1 = connector({
    structured: true,
    ip: notes[1].ip,        //RPC地址
    port: notes[1].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {
    alice: {
        name: uuid(),
        address: '',
    },
}
//#endregion

describe('动态吊销节点证书', () => {
    before(async () => {
        //提前配置好节点1和节点2，都拥有合法证书，运行节点1和节点2
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 120) {
            await remote.execute('miner.generate.admin', [120 - ret.result[0].height]);
        }

        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(3000);

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });

    after(()=>{
        remote.close();
    });

    it('吊销证书前', async () => {
        //连接节点2，发起转账请求
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 成功`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作成功，因其有合法证书
        assert(!ret.error);
    });

    it('吊销证书', async () => {
        //切换连接节点1，系统管理员发起请求，吊销节点2的证书
        console.log(`系统管理员吊销节点${notes[1].name}的节点证书`);
        let ret = await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        //断言操作成功
        assert(!ret.error);

        await remote.wait(10000);
    });

    it('吊销证书后', async () => {
        //切换连接节点2，发起交易请求
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 失败`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作失败，因其证书已被吊销
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('再次颁发证书', async () => {
        //切换连接节点1，系统管理员为节点2重新颁发证书
        console.log(`系统管理员再次为节点${notes[1].name}颁发节点证书`);
        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(3000);
        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(3000);
    });

    it('再次颁发后', async () => {
        //切换连接节点2，发起交易请求
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 成功`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言交易成功
        assert(!ret.error);
    });
});
