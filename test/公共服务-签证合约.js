/**
 * 联机单元测试: 公共服务-签证合约
 */

const assert = require('assert');
const uuid = require('uuid/v1');
const remote = (require('../lib/remote/connector'))();

//声明中间环境变量
let env = {
    alice: {name: uuid()},
    bob: {name: uuid()},
    contract: '',
};

describe('公共服务-签证合约', () => {
    before(async () => {
        //生成Alice和Bob专属地址
        let ret = await remote.execute('address.create', [env.alice.name]);
        env.alice.address = ret.address;
        ret = await remote.execute('address.create', [env.bob.name]);
        env.bob.address = ret.address;

        //系统转账，数据上链
        await remote.execute('tx.send', [env.alice.address, 500000000]);
        await remote.execute('tx.send', [env.alice.address, 500000000]);
        await remote.execute('tx.send', [env.bob.address, 500000000]);
        await remote.execute('tx.send', [env.bob.address, 500000000]);
        await remote.execute('miner.generate.admin', [1]);
    });

    it('Alice查询公共服务-签证合约的服务接口', async () => {
        let msg = await remote.execute('sc.query', [{'type':'issue', 'cls': 'public'}]);
        env.contract = msg.address;
    });

    it('Alice调用签证合约，向Bob发送签证申请', async () =>{
        let ret = await remote.execute('sc.run', [
            `${env.contract}, 50000`,
            {'oper': 'issue', 'addr': env.bob.address},
            env.alice.name,
        ]);
    });
});
