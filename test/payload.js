const assert = require('assert');
const remote = (require('../lib/remote/connector'))();

let env = {
    address: [],
    txid: [],
    recy: 100,
};

describe.skip('payload', () => {
    before(async ()=>{
        //开启长连模式
        //remote.setmode(remote.CommMode.ws, async () => { });
    });

    it('简单事务: adress.create', async () => {
        console.time('createAddress');
        for(let i = 0; i < env.recy; i++) {
            let ret = await remote.execute('address.create', []);
            env.address.push(ret.address);
        }
        console.timeEnd('createAddress');
    });

    it('精确查询: adress.has', async () => {
        console.time('address');
        for(let i = 0; i< env.recy; i++) {
            await remote.execute('address.has', [env.address[i]]);
        }
        console.timeEnd('address');
    });

    it('复杂事务: tx.send', async () => {
        console.time('tx.send');
        for(let i = 0; i < env.recy; i++) {
            let ret = await remote.execute('tx.send', [env.address[i], 1000000]);
            env.txid.push(ret.hash);
        }
        console.timeEnd('tx.send');
    });

    it('精确查询: tx.get', async () => {
        console.time('tx.get');
        for(let i = 0; i < env.recy; i++) {
            let ret = await remote.execute('tx.get', [env.txid[i]]);
            assert(ret.hash, env.txid[i]);
        }
        console.timeEnd('tx.get');
    });

    it('轻量查询: sysEcho', async () => {
        console.time('sysEcho');
        for(let i = 0; i< env.recy; i++) {
            await remote.execute('sysEcho', []);
        }
        console.timeEnd('sysEcho');
    });
});
