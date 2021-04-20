/**
 * 联机单元测试：系统监控
 * Creted by liub 2020.10.30
 */

const assert = require('assert');

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
                let rt, ret = {}, retSlaver = {};

                try {
                    const remoteSlaver = (require('../lib/remote/connector'))({
                        ip: '127.0.0.1',
                        port: 2112,
                    });

                    rt = await remoteSlaver.execute('block.count', []);
                    retSlaver.hi = rt;
                        
                    rt = await remoteSlaver.execute('mempool.info', []);
                    retSlaver.orp = rt.orphans;
                    retSlaver.ms = rt.size;
                    retSlaver.mb = rt.bytes;
    
                    rt = await remoteSlaver.execute('tx.pending.count', []);
                    retSlaver.pend = rt;
    
                    console.log('slaver', retSlaver);
                } catch(e) {}

                try {
                    const remote = (require('../lib/remote/connector'))();

                    rt = await remote.execute('block.count', []);
                    ret.hi = rt;
    
                    rt = await remote.execute('mempool.info', []);
                    ret.orp = rt.orphans;
                    ret.ms = rt.size;
                    ret.mb = rt.bytes;
    
                    rt = await remote.execute('tx.pending.count', []);
                    ret.pend = rt;
    
                    console.log('master', ret);
					console.log('----------------------------------------------------------------');

                    await remote.wait(3000);
                } catch(e) {}

            } catch(e) {
                console.log(e);
            }
        }
     });
});
