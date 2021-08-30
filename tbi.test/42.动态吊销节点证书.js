/**
 * 联机单元测试：动态吊销节点证书
 * @description
    验证系统能吊销某节点证书，具备完善的证书管理体系
    1.正常节点发送交易
    2.吊销该节点证书
    3.被吊销节点再次发送交易
    
    预期结果：
    1.正常节点发送交易，执行成功
    2.吊销后节点发送交易，执行中断，并给出相应提示
 */

const assert = require('assert')
const connector = require('../lib/remote/connector')
const uuid = require('uuid/v1')
const {notes} = require('../lib/remote/common')

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

let env = {
    alice: {
        name: uuid(),
        address: '',
    },
}

describe('动态吊销节点证书', () => {
    before(async () => {
        //提前配置好节点1和节点2，都拥有合法证书，运行节点1和节点2
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }

        await remote.execute('sys.aliance.refresh', [500000000]);
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(2000);
    });

    after(()=>{
        remote.close();
    });

    it('吊销证书前', async () => {
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 成功`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
    });

    it('吊销证书', async () => {
        console.log(`系统管理员吊销节点${notes[1].name}的节点证书`);
        let ret = await remote.execute('sys.aliance.delete', [1, 'mchain']);
        assert(!ret.error);

        await remote.wait(6000);
    });

    it('吊销证书后', async () => {
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 失败`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!!ret.error);
        console.log(ret.error);
    });

    it('再次颁发证书', async () => {
        console.log(`系统管理员再次为节点${notes[1].name}颁发节点证书`);
        let ret = await remote.execute('sys.aliance.create', ['bookmansoft', notes[1].id, notes[1].aliance, `${notes[1].ip}:${notes[1].tcp}`]);
        assert(!ret.error);

        await remote.wait(5000);
    });

    it('再次颁发后', async () => {
        console.log(`节点${notes[1].name}向账户${env.alice.name}发起一笔转账: 成功`);
        let ret = await remote1.execute('tx.create', [{"sendnow":true}, [{"value":2000000, "account": env.alice.name}]]);
        assert(!ret.error);
    });
});
