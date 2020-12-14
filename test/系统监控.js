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

//设定测试所需的环境变量
let env = {
};

describe('意愿存证', function() {
    /**
     * 单元测试模块后置处理流程
     */
    after(() => {
        remote.close();
    });

    it('系统信息', async () => {
        while(true) {
            let ret = await remote.execute('block.tips', []);
            console.log('master', ret);
    
            ret = await remoteSlaver.execute('block.tips', []);
            console.log('slaver', ret);

            await remote.wait(3000);
        }
     });
});
