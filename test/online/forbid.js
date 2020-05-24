/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const assert = require('assert')
const remote = (require('./connector'))({structured: true});

//在多个测试用例间传递中间结果的缓存变量
let env = {
    value: 5000000,
}; 

describe.skip('管理节点的管理流程', () => {
    //#region 开启长连模式
    before(async ()=>{
        remote.setmode(remote.CommMode.ws, async () => { });
    });
    //#endregion

    it('新建一个地址', async () => {
        let ret = await remote.execute('address.create', []);
        assert(ret.code == 0);
        env.address = ret.result.address;
    });

    it('禁用该地址 - 成功', async () => {
        let ret = await remote.execute('forbid', [env.address]);
        assert(ret.code == 0);
        ret = await remote.execute('listforbid', []);
        assert(ret.code == 0);
        console.log('当前禁用列表');
        console.log(ret.result);
        
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);
    });

    it('向该地址转账 - 失败', async () => {
        let ret = await remote.execute('tx.send', [env.address, env.value]);
        assert(ret.code != 0);
    });

    it('解禁该地址 - 成功', async () => {
        let ret = await remote.execute('unforbid', [env.address]);
        assert(ret.code == 0);
        ret = await remote.execute('listforbid', []);
        assert(ret.code == 0);
        console.log('当前禁用列表');
        console.log(ret.result);

        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);
    });

    it('向该地址转账 - 成功', async () => {
        let ret = await remote.execute('tx.send', [env.address, env.value]);
        assert(ret.code == 0);
    });

    it('禁用关键字 - 成功', async () => {
        let ret = await remote.execute('forbidw', ['hello']);
        assert(ret.code == 0);
        ret = await remote.execute('listforbidw', []);
        assert(ret.code == 0);
        console.log('当前禁用关键字列表');
        console.log(ret.result);
        
        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);
    });

    it('向该地址转账，带指定关键字备注 - 失败', async () => {
        let ret = await remote.execute('tx.create', [ { comment: {'content':'hello'}, sendnow: true, }, [{ value: env.value, address: env.address,}], ]);
        assert(ret.code != 0);
    });

    it('解禁关键字 - 成功', async () => {
        let ret = await remote.execute('unforbidw', ['hello']);
        assert(ret.code == 0);
        ret = await remote.execute('listforbidw', []);
        assert(ret.code == 0);
        console.log('当前禁用关键字');
        console.log(ret.result);

        await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(2000);
    });

    it('向该地址转账，带指定关键字备注 - 成功', async () => {
        let ret = await remote.execute('tx.create', [ { comment: {'content':'hello'}, sendnow: true, }, [{ value: env.value, address: env.address,}], ]);
        assert(ret.code == 0);
    });
});
