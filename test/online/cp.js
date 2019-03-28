/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')

//引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'xxxxxxxx-game-gold-root-xxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
    token:  '02c6754571e0cf8949fb71906a501ba520b8e960c7eb35cb3931e362e5d25d2bc5', //授权节点令牌固定量，用于访问远程钱包时的认证
});

describe('厂商管理流程', () => {
    it('WEB模式查询余额', async () => {
        let ret = await remote.execute('balance.all', []);
        console.log(ret);
    });

    it('WS模式查询余额', async () => {
        await remote.setmode(remote.CommMode.ws).login();
        let ret = await remote.execute('balance.all', []);
        console.log(ret);
    });

    it('创建一个厂商', async ()=>{
        await (async function(time){
            return new Promise(resolve =>{
                setTimeout(resolve, time);
            });
        })(1000);
        console.log('create前账户信息', await remote.execute('balance.all', []));

        let ret = await remote.execute('cp.create', [uuid(), 'http://127.0.0.1']);
        console.log(ret);

        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){
            return new Promise(resolve =>{
                setTimeout(resolve, time);
            });
        })(1000);
        console.log('create后账户信息', await remote.execute('balance.all', []));
    });

    it('列表现有厂商', async () => {
        let ret = await remote.execute('cp.query', []);
        console.log(ret);
    });
});