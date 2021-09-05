/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

const assert = require('assert')
const remote = (require('../lib/remote/connector'))();

describe.skip('区块相关的JSONP', function() {
    it('RESTFUL/GET 查询区块信息', async () => {
        let ret = await remote.get('block/4d80d69a80967c6609fa2606e07fb7e3ad51f8338ce2f31651cb0acdd9250000');
        console.log(ret);
    });


    it('获取近期区块列表', async () => {
        let msg = await remote.get('blocks');
        if(!msg.error) {
            console.log(msg);
        }
        else {
            console.log(msg.error.message);
        }
    });

    it('获取同步状态', async () => {
        let msg = await remote.setmode(remote.CommMode.ws).execute('isSynced', []);
        console.log(msg);
    });

    // it('获取区块概要信息', async () => {
    //     try {
    //         let msg = await remote.setmode(remote.CommMode.ws).execute('getBlockOverview', ['d798755ecd93f9cbbbd4fa726972fc0b3c4a1656bdfc8ab4f1d02d1aaed2ed5b']);
    //         console.log(msg);
    //     } catch(e) {
    //         console.log(e.message);
    //     }
    // });

    it('获取区块原始信息', async () => {
        try {
            //设置长连模式
            remote.setmode(remote.CommMode.ws);

            let msg = await remote.execute('getRawBlock', ['d798755ecd93f9cbbbd4fa726972fc0b3c4a1656bdfc8ab4f1d02d1aaed2ed5b']);
            console.log(msg);
        } catch(e) {
            console.log(e.message);
        }
    });

    it('获取系统概要信息', async () => {
        try {
            //设置长连模式
            remote.setmode(remote.CommMode.ws, async () => {});
            let msg = await remote.execute('sys.info', []);
            console.log(msg);
        } catch(e) {
            console.log(e.message);
        }
    });

    it('测试长连下异步回调应答是否匹配', async () => {
        try {
            //设置长连模式
            remote.setmode(remote.CommMode.ws, async () => {});

            await remote.execute('miner.setsync.admin', []);

            for(let i = 0; i < 100; i++) {
                let msg = await remote.execute('tx.list', []);
                assert(msg[0].account);

                msg = await remote.execute('balance.all', []);
                assert(msg.confirmed);
            }
        } catch(e) {
            console.log(e.message);
        }
    });
});
