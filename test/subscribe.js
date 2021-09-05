/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

const remote = (require('./connector'))();

describe.skip('订阅与退订', function() {
    it('订阅区块消息', async () => {
        await remote.setmode(remote.CommMode.ws).watch(msg => {
            console.log(msg);
        }, 'p2p/block').execute('subscribe', ['p2p/block']);
        await remote.execute('unsubscribe', ['p2p/block']);
    });

    it('WS模式监听消息', async () => {
        await remote.setmode(remote.CommMode.ws, async () => {});

        //通过监听收到消息
        remote.watch(msg => {
            console.log('tx.client', msg);
        }, 'tx.client').watch(msg => {
            console.log('balance.client', msg);
        }, 'balance.client');

        //获得一个新的地址
        let ret = await remote.execute('address.create', []);
        let newaddr = ret.address;

        //向该地址转账
        await remote.execute('tx.send', [newaddr, 20000]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(3000);
    });
});
