/**
 * 联机单元测试：道具管理
 * Creted by liub 2020.04.28
 * @description
 * 道具管理指百谷王链对链上资产所提供的一整套综合管理机制，包括：
 * 1. 作为道具发行者的厂商的注册管理
 * 2. 道具的发行、流转、回收、竞拍
 * 3. 基于道具模式的记账权管理
 */

const uuid = require('uuid/v1')
const assert = require('assert')
const remote = (require('../../lib/remote/connector'))({});

let env = {
    alice: {
        name: 'miner-alice'+ uuid().slice(0,25),
        address: '',
    },
    cp: {
        name: "miner-cp-"+ uuid().slice(0,27),
        id: '',
    },
    props: [],
}; 

describe('道具管理流程', () => {
    before(async () => {
        await remote.execute('miner.setsync.admin', [true]);
        let ret = await remote.execute('block.tips', []);
        if(ret[0].height < 100) {
            await remote.execute('miner.generate.admin', [100 - ret[0].height]);
        }
        await remote.wait(500);

        //订阅并监听消息，该消息不是默认下发，需要事先订阅
        await remote.watch(msg => {
            console.log('prop/receive:', msg);
        }, 'prop/receive')
        .execute('subscribe', ['prop/receive']);
    });

    it('机构注册：厂商注册', async () => {
        //注册一个新的CP, 指定 15% 的媒体分成
        let ret = await remote.execute('cp.create', [env.cp.name, '127.0.0.1,,slg,15']);
        assert(!ret.error);

        //确保数据上链
        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);

        //查询CP信息
        ret = await remote.execute('cp.byName', [env.cp.name]);
        env.cp.id = ret.cid;
    });

    it('创建道具：机构创建一个道具', async () => {
        let ret = await remote.execute('prop.create', [env.cp.id, env.cp.name, 10000]);
        assert(!ret.error);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(500);
        
        ret = await remote.execute('prop.query', [[['oid', env.cp.name]]]);
        for(let item of ret.list) {
            if(item.pst != 4) {
                env.props.push({pst:item.pst, pid: item.pid, hash: item.current.hash, gold: item.gold, cid: item.cid});
            }
        }
    });

    it('拍卖道具：道具拥有者拍卖道具', async () => {
        if(env.props.length > 0) {
            await remote.execute('prop.sale', [env.props[0].pid, 30000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);
        } else {
            console.log('Empty Prop List');
        }
    });

    it('竞拍道具：第三方参与竞拍道具', async () => {
        let sales = await remote.execute('prop.remoteQuery', [[['pst', 2], ['oid', env.cp.name]]]);
        if(sales.list.length > 0) {
            await remote.execute('prop.buy', [sales.list[0].pid, 30000]);
            await remote.execute('miner.generate.admin', [1]);
            await remote.wait(1000);
        } else {
            console.log('Empty Sale List');
        }
    });

    it('转移道具：道具拥有者转移一个道具, 显示成功转移后的道具信息', async ()=> {
        //Alice生成一个接收道具的地址
        let ret = await remote.execute('address.create', [env.alice.name]);
        assert(!ret.error);
        env.alice.address = ret.address;

        ret = await remote.execute('prop.send', [env.alice.address, env.props[0].pid]);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1000);
    });

    it('熔铸道具：道具拥有者熔铸一个道具', async () => {
        await remote.execute('prop.found', [env.props[0].pid, env.alice.name]);

        await remote.execute('miner.generate.admin', [1]);
        await remote.wait(1500);

        let ret = await remote.execute('prop.query', [[['oid', env.cp.name]]]);
        let count = 0;
        for(let item of ret.list) {
            if(item.pst != 4) {
                count++;
            }
        }
        assert(count == 0);
    });
});
