/**
 * 联机单元测试：本地全节点提供运行时环境
 */

//引入授权式连接器
const remote = require('../../lib/authConn')

//设置授权式连接器的网络类型和对应参数，网络类型分为 testnet 和 main
remote.setup({
    type:   'testnet',            //远程全节点类型
    ip:     '127.0.0.1',          //远程全节点地址
    apiKey: 'bookmansoft',        //远程全节点基本校验密码
    id:     'primary',            //默认访问的钱包编号
    cid:    'terminal001',        //终端编码，作为访问远程全节点时的终端标识
    token:  '0340129aaa7a69ac10bfbf314b9b1ca8bdda5faecce1b6dab3e7c4178b99513392', //访问钱包时的令牌固定量，通过HMAC算法，将令牌随机量和令牌固定量合成为最终的访问令牌
});

describe.only('道具管理流程', () => {
    it('设定厂商和转移地址信息', async () => {
        let ret = await remote.execute('cp.list', []);
        if(!!ret && ret.length>0) {
            console.log(ret);
        }
        else {
            console.log('厂商列表为空');
        }
    });
});