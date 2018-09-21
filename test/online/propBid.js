/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1');
const gamegold = require('gamegold')
const util = gamegold.util
const remote = require('../util/consoleConn')

let env = {}; //在多个测试用例间传递中间结果的缓存变量

describe.skip('道具拍卖流程', ()=>{
    it('列表厂商', async ()=>{
        let ret = await remote.execute('cp.list', []);
        if(ret.length > 0) {
            env.cp = ret[0];
            console.log(env.cp.cid);
            console.log('创建道具前账户信息', await remote.execute('balance.all', []));
        }
    });

    it('创建一个道具', async () => {
        if(env.cp){
            await remote.execute('prop.order', [env.cp.cid, uuid(), 20000]);
            await util.waiting(1000);
            let ret = await remote.execute('prop.list', []);
            env.props = [];
            for(let item of ret) {
                env.props.push({pid: item.pid, hash: item.current.hash, gold: item.gold, cid: item.cid});
            }
            console.log(env.props);
        }
        else{
            console.log('Empty Cp List');
        }
    });

    it('拍卖一个道具', async () => {
        await remote.execute('generate', [2]);
        await util.waiting(1000);

        let ret = await remote.execute('prop.list', []);
        env.props = [];
        for(let item of ret) {
            env.props.push({pid: item.pid, hash: item.current.hash, gold: item.gold, cid: item.cid});
        }
        if(env.props.length > 0) {
            await remote.execute('prop.sale', [util.revHex(env.props[0].hash), 30000]);
            await util.waiting(1000);
        }
    });

    it('竞拍一个道具', async () => {
        let sales = await remote.execute('prop.list.market', []);
        if(sales.length > 0) {
            await remote.execute('prop.buy', [sales[0].pid, sales[0].bid+100]);
            await util.waiting(1000);
            await remote.execute('prop.list.bid', []);
        }
    });
});
