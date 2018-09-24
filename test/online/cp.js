/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const remote = require('../../lib/authConn')

describe.skip('厂商管理流程', () => {
    it('创建一个厂商', async ()=>{
        await remote.execute('generate', [1]);
        await (async function(time){
            return new Promise(resolve =>{
                setTimeout(resolve, time);
            });
        })(1000);
        console.log('create前账户信息', await remote.execute('balance.all', []));

        let ret = await remote.execute('cp.create', [uuid(), '127.0.0.1']);
        console.log(ret);

        await remote.execute('generate', [1]);
        await (async function(time){
            return new Promise(resolve =>{
                setTimeout(resolve, time);
            });
        })(1000);
        console.log('create后账户信息', await remote.execute('balance.all', []));
    });

    it('列表现有厂商', async () => {
        let ret = await remote.execute('cp.list', []);
        console.log(ret);
    });
});