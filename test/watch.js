/**
 * 联机单元测试：系统监控
 * Creted by liub 2020.10.30
 */

const assert = require('assert');
const remote = (require('../lib/remote/connector'))();
const remoteSlaver = (require('../lib/remote/connector'))({
    ip: '127.0.0.1',
    port: 2112,
});
const remoteSlaver2 = (require('../lib/remote/connector'))({
    ip: '127.0.0.1',
    port: 2122,
});

//设定测试所需的环境变量
let env = {
};

describe('系统监控', function() {
    /**
     * 单元测试模块后置处理流程
     */
    after(() => {
        remote.close();
    });

    it('系统信息', async () => {
        while(true) {
            try {
                let ret = await remote.execute('block.count', []);
                console.log('master', ret);
        
                ret = await remoteSlaver.execute('block.count', []);
                console.log('slaver', ret);
    
                ret = await remoteSlaver2.execute('block.count', []);
                console.log('slaver2', ret);

                console.log('-------------------------');

                await remote.wait(3000);
            } catch(e) {
            }
        }
     });
});
