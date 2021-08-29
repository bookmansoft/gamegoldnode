/**
 * 联机单元测试：系统监控
 * Creted by liub 2020.10.30
 */

const assert = require('assert');

//设定测试所需的环境变量
let env = {
};

describe('系统监控', function() {

    it('系统信息', async () => {
        let ret = [], config = [
            {
                ip: '127.0.0.1',
                port: 2102,
                spv: false,
            },
            // {
                // ip: '127.0.0.1',
                // port: 2112,
                // spv: false,
            // },
            // {
                // ip: '127.0.0.1',
                // port: 2122,
                // spv: false,
            // },
            // {
                // ip: '127.0.0.1',
                // port: 2132,
                // spv: false,
            // },
            // {
                // ip: '127.0.0.1',
                // port: 2142,
                // spv: false,
            // },
        ];

        while(true) {
            try {
                for(let i=0; i < config.length; i++) {
                    let item = config[i];

                    if(!ret[i]) {
                        ret[i] = {};
                    }

                    const remote = (require('../lib/remote/connector'))(item);
    
                    let rt = await remote.execute('block.count', []);
                    ret[i].add = rt - (ret[i].h || 0);
                    ret[i].h = rt || 0;
                        
                    if(!item.spv) {
                        // rt = await remote.execute('sys.blockinfo', []);
                        // ret[i].o = rt.orphan;
                        // ret[i].ms = 0;
                        // ret[i].mb = 0;
                        rt = await remote.execute('mempool.info', []);
                        ret[i].o = rt.orphans;
                        ret[i].ms = rt.size;
                        //ret[i].mb = rt.bytes;
                    } else {
                        ret[i].o = 0;
                        ret[i].ms = 0;
                        //ret[i].mb = 0;
                    }
    
                    rt = await remote.execute('tx.pending.count', []);
                    ret[i].p = rt;
    
                    rt = await remote.execute('tx.coincache', []);
                    ret[i].cc = rt;

                    rt = await remote.execute('coin.cache', []);
                    ret[i].tc = rt;

                    console.log(`S${i}`, ret[i]);

                    if(i == config.length-1) {
                        console.log('----------------------------------------------------------------');
                        await remote.wait(2000);
                    }
                }
            } catch(e) {}
        }
     });
});
