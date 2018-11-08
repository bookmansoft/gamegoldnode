/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')

//引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数

describe('厂商管理流程', () => {
    it('创建一个厂商', async ()=>{
        await (async function(time){
            return new Promise(resolve =>{
                setTimeout(resolve, time);
            });
        })(1000);
        console.log('create前账户信息', await remote.execute('balance.all', []));

        let ret = await remote.execute('cp.create', [uuid(), '127.0.0.1']);
        console.log(ret);

        await remote.execute('miner.generate', [1]);
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