/**
 * 联机单元测试：本地全节点提供运行时环境
 */

//引入工具包
const toolkit = require('gamegoldtoolkit')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch')) //兼容性设置，提供模拟浏览器环境中的 fetch 函数
    .setup({ //设置授权式连接器的参数
    type:   'testnet',            //希望连接的对等网络的类型，分为 testnet 和 main
    ip:     '127.0.0.1',          //远程全节点地址
    apiKey: 'bookmansoft',        //远程全节点基本校验密码
    id:     'primary',            //默认访问的钱包编号
    cid:    'terminal001',        //终端编码，作为访问远程全节点时的终端标识
    token:  '0340129aaa7a69ac10bfbf314b9b1ca8bdda5faecce1b6dab3e7c4178b99513392', //访问钱包时的令牌固定量，通过HMAC算法，将令牌随机量和令牌固定量合成为最终的访问令牌
});

describe.only('授权式连接器测试', () => {
    it('打印厂商列表', async () => {
        let ret = await remote.execute('cp.list', []);
        if(!!ret && ret.length>0) {
            console.log(ret);
        }
        else {
            console.log('厂商列表为空');
        }
    });

    it('获取护照并验签', async () => {
        let ret = await remote.execute('token.user', [
            'c0001',    //游戏编号
            'u0001'     //游戏内玩家编号
        ]);
        console.log('护照', ret);
        console.log('验签', toolkit.verifyData(ret));
    });

    it('WS模式查询余额', async () => {
        await remote.setmode(remote.CommMode.ws).login();
        let ret = await remote.execute('balance.all', []);
        //和WEB模式不同，WS模式下返回值多了一个嵌套格式
        console.log(ret);
    });
});
