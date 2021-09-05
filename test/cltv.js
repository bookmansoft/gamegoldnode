/**
 * 单元测试: GIP0027
 * Creted by liub 2020.04.20
 * Modified by liub 2020.05.13 新增对 'cst' 的支持
 */

const assert = require('assert');
const uuidv1 = require('uuid/v1');
const remote = (require('./connector'))({structured: true});
const {outputLockType} = require('../../lib/script/script');
const {SEQUENCE_GRANULARITY} = require('../../lib/protocol/consensus');

let env = {
    alice: {},
    bob: {},
    amount: 5000000,
    delay: 3,
};

let types = [
    outputLockType.CHECKRELATIVEBLOCK,
    outputLockType.CHECKRELATIVETIME,
    outputLockType.CHECKABSOLUTETIME,
    outputLockType.CHECKABSOLUTEBLOCK,
];

describe.skip('GIP0027', function() {
    before(async () => {
        //让中值时间赶上当前时间
        let ret = await remote.execute('miner.generate.admin', [20]);
        assert(ret.code == 0);
    });

    for(let type of types) {
        it('为Alice创建账号', async () => {
            env.alice.name = uuidv1();
            let ret = await remote.execute('account.create', [{'name': env.alice.name},]);
            assert(ret.code == 0);
    
            ret = await remote.execute('address.create', [env.alice.name]);
            assert(ret.code == 0);
            env.alice.address = ret.result.address;
        });
    
        it('为Bob创建账号', async () => {
            env.bob.name = uuidv1();
            let ret = await remote.execute('account.create', [{'name': env.bob.name},]);
            assert(ret.code == 0);
    
            ret = await remote.execute('address.create', [env.bob.name]);
            assert(ret.code == 0);
            env.bob.address = ret.result.address;
        });

        it('构造锁定输出交易', async () => {
            let sim = env.delay;
            switch(type) {
                case outputLockType.CHECKRELATIVEBLOCK: {
                    break;
                }

                case outputLockType.CHECKABSOLUTEBLOCK: {
                    let ret = await remote.execute('block.tips', []);
                    sim = ret.result[0].height + env.delay;

                    break;
                }

                case outputLockType.CHECKABSOLUTETIME: {
                    let ret = (Date.now()/1000)|0;
                    sim = ret + env.delay*3;

                    break;
                }

                case outputLockType.CHECKRELATIVETIME: {
                    sim = 1; //标准设置下代表2^9=512秒
                    break;
                }
            }

            let ret = await remote.execute('tx.create', [
                {'sendnow':true}, 
                [{
                    'value': env.amount, 
                    'address': env.alice.address, 
                    'locktype': type, 
                    'locktime': sim,
                }],
            ]);
            assert(ret.code == 0);
        });
        
        it('构造一笔交易，指定Alice为出款方，试图花费这笔锁定输出，结果失败', async () => {
            let ret = await remote.execute('tx.send', [
                env.bob.address,
                env.amount - 10000,
                env.alice.name,
            ]);
            assert(ret.code != 0);
        });
    
        it('查询Alice的余额，发现部分额度被锁定', async () => {
            let ret = await remote.execute('balance.all', [env.alice.name]);
            assert(ret.result.locked == env.amount);
        });
    
        it('连续出块，以满足锁定输出指定的延迟要求', async () => {
            switch(type) {
                case outputLockType.CHECKRELATIVEBLOCK: {
                    let ret = await remote.execute('miner.generate.admin', [env.delay]);
                    assert(ret.code == 0);
                    break;
                }

                case outputLockType.CHECKABSOLUTEBLOCK: {
                    let ret = await remote.execute('miner.generate.admin', [env.delay]);
                    assert(ret.code == 0);
                    break;
                }

                case outputLockType.CHECKABSOLUTETIME: {
                    await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(env.delay*3*1000);
                    //为满足中值时间的要求，多挖了几个块
                    let ret = await remote.execute('miner.generate.admin', [15]);
                    assert(ret.code == 0);
                    break;
                }

                case outputLockType.CHECKRELATIVETIME: {
                    await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})((1<<SEQUENCE_GRANULARITY)*1000);
                    //为满足中值时间的要求，多挖了几个块
                    let ret = await remote.execute('miner.generate.admin', [15]);
                    assert(ret.code == 0);
                    break;
                }
            }
        });
    
        it('查询Alice的余额，发现相关额度被解锁', async () => {
            let ret = await remote.execute('balance.all', [env.alice.name]);
            assert(ret.code == 0);
            assert(ret.result.locked == 0);
        });
    
        it('上述延迟锁输出可以被花费了', async () => {
            let ret = await remote.execute('tx.send', [
                env.bob.address,
                env.amount - 10000,
                env.alice.name,
            ]);
            assert(ret.code == 0);
        });
    }
});