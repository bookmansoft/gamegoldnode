/**
 * 联机单元测试：系统监控
 * Creted by liub 2020.10.30
 */

const assert = require('assert');
const remote = (require('../lib/remote/connector'))();

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
        let rt, ret = {};
        while(true) {
                try {
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
        }
     });
});
