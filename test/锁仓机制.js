/**
 * 单元测试: 锁仓机制 - GIP0027
 * Creted by liub 2020.04.20
 * Modified by liub 2020.05.13 新增对 'cst' 的支持
 */

const assert = require('assert');
const uuidv1 = require('uuid/v1');
const remote = (require('../test/util/connector'))({structured: true});

//引入核心库，在包引入模式下直接使用 require('gamegold')
const gamegold = require('gamegold');
const consensus = gamegold.consensus;
const {outputLockType} = gamegold.script;

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

describe('锁仓机制 - GIP0027', function() {
    before(async () => {
        await remote.execute('miner.setsync.admin', []);
        let ret = await remote.execute('block.tips', []);
        if(ret.result[0].height < 100) {
            await remote.execute('miner.generate.admin', [100-ret.result[0].height]);
        }

        //让中值时间赶上当前时间
        ret = await remote.execute('miner.generate.admin', [20]);
        assert(ret.code == 0);

        env.alice.name = uuidv1();
        env.bob.name = uuidv1();

        ret = await remote.execute('address.create', [env.alice.name]);
        assert(ret.code == 0);
        env.alice.address = ret.result.address;

        ret = await remote.execute('address.create', [env.bob.name]);
        assert(ret.code == 0);
        env.bob.address = ret.result.address;
    });

    for(let type of types) {
        it(`构造[${type}]类型的锁仓交易`, async () => {
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
        
        it('验证: Alice试图花费这笔锁定输出失败', async () => {
            let ret = await remote.execute('tx.send', [
                env.bob.address,
                env.amount - 10000,
                env.alice.name,
            ]);
            assert(ret.code != 0);
        });
    
        it('查询: Alice查询余额，发现部分额度被锁定', async () => {
            let ret = await remote.execute('balance.all', [env.alice.name]);
            assert(ret.result.locked == env.amount);
        });
    
        it('解锁: 通过连续出块来满足锁定输出指定的延迟要求', async () => {
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
                    await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})((1<<consensus.SEQUENCE_GRANULARITY)*1000);
                    //为满足中值时间的要求，多挖了几个块
                    let ret = await remote.execute('miner.generate.admin', [15]);
                    assert(ret.code == 0);
                    break;
                }
            }
        });
    
        it('查询: Alice查询余额，发现相关额度被解锁', async () => {
            let ret = await remote.execute('balance.all', [env.alice.name]);
            assert(ret.code == 0);
            assert(ret.result.locked == 0);
        });
    
        it('验证: Alice试图花费这笔锁定输出成功', async () => {
            let ret = await remote.execute('tx.send', [
                env.bob.address,
                env.amount - 10000,
                env.alice.name,
            ]);
            assert(ret.code == 0);
        });
    }
});