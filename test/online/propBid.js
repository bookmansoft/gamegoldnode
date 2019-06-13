/**
 * 联机单元测试 ：道具拍卖流程
 * 1. 创建随机账户A、B，向其转账并监控其账户余额
 * 2. A创建一个道具，监控其账户余额 - 变少
 * 3. A将之前创建的道具进行拍卖
 * 4. B发起一个一口价竞拍，监控其账户余额 - 变少
 * 5. 监控A账户余额 - 变多
 * 6. 监控A、B账户的道具列表 - 发生了道具转移
 */

const uuid = require('uuid/v1');

//引入工具包
const toolkit = require('gamerpc')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数

let env = {}; //在多个测试用例间传递中间结果的缓存变量
let oid = "propBid-oid"+ uuid().slice(0,25);

describe('道具拍卖流程', ()=>{
    it('列表厂商', async ()=>{
        let ret = await remote.execute('cp.query', []);
        if(ret.list.length > 0) {
            env.cp = ret.list[0];
            console.log(env.cp.cid);
            console.log('创建道具前账户信息', await remote.execute('balance.all', []));
        }
    });

    it('创建一个道具', async () => {
        if(env.cp) {
            await remote.execute('prop.create', [env.cp.cid, oid, 10000]);
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(1000);
            let ret = await remote.execute('prop.query', [[['oid', oid]]]);
            env.props = [];
            for(let item of ret.list) {
                if(item.pst != 4) {
                    env.props.push({pst:item.pst, pid: item.pid, hash: item.current.hash, gold: item.gold, cid: item.cid});
                }
            }
            console.log(env.props);
        }
        else {
            console.log('Empty Cp List');
        }
    });

    it('拍卖一个道具', async () => {
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);

        if(env.props.length > 0) {
            await remote.execute('prop.sale', [env.props[0].pid, 30000]);
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);
        } else {
            console.log('Empty Prop List');
        }
    });

    it('竞拍一个道具', async () => {
        let sales = await remote.execute('prop.remoteQuery', [[['pst', 2]]]);
        console.log(sales);
        if(sales.length > 0) {
            await remote.execute('prop.buy', [sales[0].pid, 30000]);
            await remote.execute('miner.generate.admin', [1]);
            await (async function(time){ return new Promise(resolve =>{ setTimeout(resolve, time);});})(2000);
        } else {
            console.log('Empty Sale List');
        }
    });
});
