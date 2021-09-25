/**
 * 可信区块链功能测试
 * 检验项目：
 *  (43). 节点证书冻结和恢复
 * 测试目的：验证系统能进行节点证书的冻结和恢复，具备完善的证书管理体系
 * 前置条件：
    提前配置好节点1和节点2(拥有合法证书)并确保正常运行
 * 测试流程：
    1.正常节点发送交易；
    2.冻结该节点证书。
    3.被冻结节点再次发送交易；
    4.恢复该节点证书；
    5.该节点再次发送交易
 * 预期结果：
    1.正常节点发送交易成功，交易执行成功；
    2.冻结节点，发送交易，执行失败，给出相应提示；
    3.恢复后节点，发送交易成功，交易执行成功
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

describe('节点证书冻结和恢复', () => {
    before(async () => {
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

    it('冻结证书前', async () => {
        //连接节点2，发起一笔转账交易
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 成功`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作成功，因为此时节点2拥有有效证书
        assert(!ret.error);
    });

    it('冻结证书', async () => {
        //切换连接节点1，以系统管理员身份，发起指令冻结节点2的证书
        console.log(`系统管理员冻结节点${notes[1].name}的节点证书`);
        let ret = await remote.execute('sys.aliance.delete', [notes[1].id, notes[1].aliance]);
        assert(!ret.error);

        await remote.wait(10000);
    });

    it('冻结证书后', async () => {
        //切换连接节点2，发起一笔转账交易
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 失败`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作失败，因为此时节点2的证书被冻结
        assert(!!ret.error);
        //打印错误信息
        console.log(ret.error);
    });

    it('解冻证书', async () => {
        //切换连接节点1，以系统管理员身份，发起指令解冻节点2的证书
        console.log(`系统管理员为节点${notes[1].name}解冻节点证书`);
        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(3000);
        await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].inner}:${notes[1].tcp}`]);
        await remote.wait(3000);
    });

    it('解冻证书后', async () => {
        //切换连接节点2，发起一笔转账交易
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 成功`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        //断言操作成功，因为此时节点2拥有有效证书
        assert(!ret.error);
    });
});