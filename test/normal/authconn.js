/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const toolkit = require('gamerpc')
const remote = (require('../lib/remote/connector'))();

describe.skip('授权式连接器测试', () => {
    it('打印厂商列表', async () => {
        let ret = await remote.execute('cp.query', []);
        if(!!ret && ret.length>0) {
            console.log(ret);
        }
        else {
            console.log('厂商列表为空');
        }
    });

    it('获取护照并验签', async () => {
        let ret = await remote.execute('cp.user', [
            'c0001',    //游戏编号
            'u0001'     //游戏内玩家编号
        ]);
        console.log('护照', ret);
        console.log('验签', toolkit.verifyData(ret));
    });

    it('WS模式查询余额', async () => {
        try {
            await remote.setmode(remote.CommMode.ws).login();
            let ret = await remote.execute('balance.all', []);
            //和WEB模式不同，WS模式下返回值多了一个嵌套格式
            console.log(ret.result);
        }
        catch(e) {
            console.log(e.message);
        }
    });
});
