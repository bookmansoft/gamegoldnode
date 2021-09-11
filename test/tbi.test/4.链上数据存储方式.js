/**
 * 联机单元测试：链上数据存储方式
 * @description
    验证系统所支持的数据存储方式，披露账本数据（区块、交易等）以及状态数据的存储方式，包括：
    1.支持的数据库类型，支持数据库类型灵活配置
    系统当前支持[leveldb]和[indexeddb] lib/db/backends.js lib/db/backends-browser.js
    同时支持[rocksdb]和[lmdb]，但其兼容性尚需进一步验证，同时为减少包体大小，发行版并未打包[rocksdb]和[lmdb]库 lib/db/ldb.js 

    2.敏感数据加密存储
    Alice和Bob通过ECDH协议交换敏感信息，相关链上信息加密存储
 */

const assert = require('assert')
const uuid = require('uuid/v1')
const {notes} = require('../../lib/remote/common')
const remote = (require('../../lib/remote/connector'))({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,     //RPC端口
});

let env = {
    alice: {name: `Alice-${uuid()}`,},
    bob: {name: `Bob-${uuid()}`,},
};

describe('链上数据存储方式', function() {
    after(()=>{
        remote.close();
    });

    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret.result[0].height]);
        }
        for(let i = 0; i < 2; i++) {
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":20000000, "account": env.alice.name}]]);
            await remote.execute('tx.create', [{"sendnow":true}, [{"value":20000000, "account": env.bob.name}]]);
        }
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);

        //设置长连模式
        remote.setmode(remote.CommMode.ws, async () => { });
        //设置事件处理句柄
		remote.watch(async msg => {
            console.log('[收到一个加密消息]');
            console.log(`发送:${msg.from}`);
            console.log(`接收:${msg.to}`);
            console.log(`内容:${msg.content}`);

            console.log('[查看链上消息记录]');
            let ret = await remote.execute('comm.listNotify', [[['body.dst', env.bob.address]]]);
            for(let item of ret.result.list) {
                if(!!item.body.content.packet) {
                    console.log(`发送:${item.body.src}`);
                    console.log(`接收:${item.body.dst}`);
                    console.log(`内容:${item.body.content.packet}`);
                    console.log(`序号:${item.sn}`);
                    console.log(`高度:${item.h}`);
                }
            }
        }, 'notify.secret');
    });

    it('创建地址：Bob生成会话地址并展示给Alice', async () => {
        let ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;
        console.log(`Bob的收信地址: ${env.bob.address}`);
    });

    it('Alice使用Bob展示的会话地址，和Bob建立会话连接', async () => {
        //通讯握手，消息内容可设置为空
        await remote.execute('comm.secret', [
            env.bob.address,
            '',
            env.alice.name,
        ]);
        await remote.wait(1000);
    });

    it('发送加密消息：Alice发送消息给Bob', async () => {
        await remote.execute('comm.secret', [
            env.bob.address,
            `${env.bob.name}, 您好！`,
            env.alice.name,
        ]);
        await remote.wait(1000);
    });
});
