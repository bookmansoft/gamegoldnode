/**
 * 联机单元测试: GIP0028 跨链
 */

const assert = require('assert');
const uuidv1 = require('uuid/v1');
const remote = (require('./connector'))({structured: true});
const common = require('../util/common');
const consensus = require('../../lib/protocol/consensus');

let env = {
    alice: {},
    bob: {},
};

describe('GIP0028 - 跨链', () => {
    before(async ()=>{
        remote.setmode(remote.CommMode.ws, async () => { });

        remote.watch(async msg => {
            if(msg.account == env.bob.name) {
                if(env.select > 0.33) {
                    let ret = await remote.execute('htlc.assent', [{txid: common.revHex(msg.shash), index: msg.sidx}, env.bob.name]);
                    assert(ret.code == 0);
                    await remote.execute('miner.generate.admin', [1]);
                    console.log('assent commit!');
                }
            } else {
                if(env.select <= 0.33) {
                    await remote.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD*2]);
                    let ret = await remote.execute('htlc.suggest.cancel', [{txid: common.revHex(msg.shash), index: msg.sidx, sa: env.alice.sa, master: env.alice.address}, env.bob.name]);
                    assert(ret.code == 0);
                    ret = await remote.execute('miner.generate.admin', [1]);
                    assert(ret.code == 0);
                    console.log('suggest canceled!');
                }
            }
        }, 'htlcsuggest.receive').watch(async msg => {
            if(msg.account == env.alice.name) {
                if(env.select > 0.66) {
                    let ret = await remote.execute('htlc.assent.deal', [{txid: common.revHex(msg.ahash), index: msg.aidx, sa: msg.secret}, env.alice.name]);
                    assert(ret.code == 0);
                    await remote.execute('miner.generate.admin', [1]);
                    console.log('assent deal!');
                }
            } else {
                if(env.select <= 0.66) {
                    await remote.execute('miner.generate.admin', [consensus.HTLC_CANCEL_PERIOD]);
                    let ret = await remote.execute('htlc.assent.cancel', [{txid: common.revHex(msg.ahash), index: msg.aidx, master: env.bob.address}, env.bob.name]);
                    assert(ret.code == 0);
                    ret = await remote.execute('miner.generate.admin', [1]);
                    assert(ret.code == 0);
                    console.log('assent canceled!');
                }
            }
        }, 'htlcassent.receive').watch(async msg => {
            if(msg.account == env.bob.name) {
                let ret = await remote.execute('htlc.suggest.deal', [{txid: common.revHex(msg.shash), index: msg.sidx, sa: msg.secret}, env.bob.name]);
                assert(ret.code == 0);
                console.log('suggest deal!');
                ret = await remote.execute('miner.generate.admin', [1]);
                assert(ret.code == 0);
            }
        }, 'htlcassent.deal').watch(async msg => {
            if(msg.account == env.alice.name) {
                assert(msg.pst, 4);
                console.log('contract finished!');
            }
        }, 'htlcsuggest.deal');
    });

    it('为Alice创建账号和通用地址', async () => {
        env.alice.name = uuidv1();
        let ret = await remote.execute('account.create', [{'name': env.alice.name},]);
        assert(ret.code == 0);

        ret = await remote.execute('address.create', [env.alice.name]);
        assert(ret.code == 0);
        env.alice.address = ret.result.address;
        env.alice.sa = ret.result.publicKey;
    });

    it('为Bob创建账号和通用地址', async () => {
        env.bob.name = uuidv1();
        let ret = await remote.execute('account.create', [{'name': env.bob.name},]);
        assert(ret.code == 0);

        ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;
        env.bob.sa = ret.result.publicKey;
    });

    it('Alice发送Suggest至Bob的通用地址', async () => {
        for(let i = 0; i < 200; i++) {
            await remote.execute('tx.send', [env.alice.address, 500000000]);
            await remote.execute('tx.send', [env.bob.address, 500000000]);
            await remote.execute('miner.generate.admin', [1]);

            console.log(`[第${i+1}轮]`);
            env.select = Math.random(); //每轮重新进行随机设定 

            let ret = await remote.execute('address.create', [env.alice.name]);
            assert(ret.code == 0);
            env.alice.address = ret.result.address;
            env.alice.sa = ret.result.publicKey;

            ret = await remote.execute('address.create', [env.bob.name]);
            assert(ret.code == 0);
            env.bob.address = ret.result.address;
            env.bob.sa = ret.result.publicKey;

            ret = await remote.execute('htlc.suggest', [{alice: env.alice.address, bob: env.bob.address, target: 'remote'}, env.alice.name]);
            assert(ret.code == 0);
            console.log('suggest commit!');
            
            await remote.execute('miner.generate.admin', [1]);

            //由于采用了env缓存账号信息，为避免数据紊乱，需要等待一段时间，让系统完成之前的交易流程
            await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(1000);
        }
    });
});
