/**
 * 单元测试: 节点管理
 * @description 
 * 1. 本单元测试采用子进程模式调度节点自动运行，不需事先运行外部节点
 * 2. 可以任意指定合法网络类型、端口偏移量，进行节点部署
 */

const assert = require('assert')
const connector = require('../lib/remote/connector');
const common = require('../lib/remote/common');

const exec = require('child_process').exec; 
let child = null;
let env = {
    network: 'evidence',    //子网类型
    netport: 2402,          //子网类型对应RPC默认端口
    offset: 0,              //端口偏移量设置
}

const remote = connector({
    type: env.network, 
    port: env.netport + env.offset
});

describe('节点管理', () => {
    after(()=>{
        //退出节点运行
        if(child) {
            child.kill('SIGTERM');
        }
    });

    it('节点运行：调度子进程运行节点', async () => {
        //1. 拉取项目代码，进入项目根目录
        //。。。

        //2. 采用子进程模式调度节点自动运行
        child = exec(`node bin/node --genesis --port-offset=${env.offset} --network=${env.network}`, function(err, stdout, stderr) {
            if(err) {
                console.log(stderr);
            } else {
                // var data = JSON.parse(stdout);
                // console.log(data);
            }
        });

        child.on('exit', () => {
            //console.log('node exit.');
        });

        await remote.wait(3000);
    });

    it('自动记账：设置节点自动记账', async () => {
        let ret = await remote.execute('miner.set.admin', [true]);
        assert(!ret.error && ret.mode == true);
    });

    it('手动记账：设置节点手动记账', async () => {
        let ret = await remote.execute('miner.set.admin', [false]);
        assert(!ret.error && ret.mode == false);

        //设置一个等待时间
        await remote.wait(1000);

        ret = await remote.execute('block.tips', []);
        assert(!ret.error);
        env.height = parseInt(ret[0].height);

        ret = await remote.execute('miner.generate.admin', [1]);
        assert(!ret.error);
        env.blockid = common.revHex(ret[0]);
        await remote.wait(1000);

        ret = await remote.execute('block.tips', []);
        assert(!ret.error);
        assert(env.height == parseInt(ret[0].height) - 1);
    });

    it('查询记账设置：查询记账设置的当前状态', async () => {
        let ret = await remote.execute('miner.check', []);
        assert(!ret.error);
        assert(ret.mode == false);
    });

    it('查询记账难度：查询当前记账难度', async () => {
        let ret = await remote.execute('miner.difficulty', []);
        assert(!ret.error);
    });

    it('查询区块信息：查询指定区块信息', async () => {
        let ret = await remote.get(`block/${env.blockid}`);
        assert(!ret.error);
    });

    it('查询区块列表：获取近期区块列表', async () => {
        let msg = await remote.get('blocks');
        assert(!msg.error);
    });

    it('查询同步：获取同步状态', async () => {
        //设置长连模式
        remote.setmode(remote.CommMode.ws);

        let msg = await remote.execute('isSynced', []);
        assert(!msg.error);
    });

    it('查询区块概要：获取区块概要信息', async () => {
        let msg = await remote.execute('getBlockOverview', [env.blockid]);
        assert(!msg.error);
    });

    it('查询区块数据：获取区块原始信息', async () => {
        let msg = await remote.execute('getRawBlock', [env.blockid]);
        assert(!msg.error);
    });

    it('查询系统概要：获取系统概要信息', async () => {
        let msg = await remote.execute('sys.info', []);
        assert(!msg.error);
    });

    it('测试长连下异步回调应答是否匹配', async () => {
        try {
            await remote.execute('miner.setsync.admin', []);

            for(let i = 0; i < 10; i++) {
                let msg = await remote.execute('tx.list', []);
                assert(msg[0].account);

                msg = await remote.execute('balance.all', []);
                assert(msg.confirmed);
            }
        } catch(e) {
            console.log(e.message);
        }
    });

    it('查询块链顶部：获取当前主链顶部区块哈希', async () => {
        let ret = await remote.execute('block.best', []);
        assert(!ret.error);
        env.hash = ret;
    });

    it('查询块链高度：获取当前主链区块数量', async () => {
        let ret = await remote.execute('block.count', []);
        assert(!ret.error);
        env.height = ret;
    });

    it('查询区块：根据区块哈希查询区块内容', async () => {
        let ret = await remote.execute('block.info', [env.hash]);
        assert(!ret.error);
        assert(ret.hash == env.hash);
    });

    it('查询区块：根据区块高度查询区块内容', async () => {
        let ret = await remote.execute('block.info.byheight', [env.height]);
        assert(!ret.error);
        assert(ret.hash == env.hash);
    });

    it('查询分叉：列表所有分叉的头部信息', async () => {
        let ret = await remote.execute('block.tips', []);
        assert(!ret.error);
    });

    it('重置区块：重置区块头至指定区块', async () => {
        await remote.execute('miner.generate.admin', [1]);

        let ret = await remote.execute('block.reset.admin', [env.height]);
        assert(!ret.error);

        ret = await remote.execute('block.count', []);
        assert(!ret.error);
        assert(env.height == ret);
    });

    it('系统状态：查询系统概要信息', async () => {
        let ret = await remote.execute('sys.info', []);
        assert(!ret.error);
    });

    it('块链状态：查询块链概要信息', async () => {
        let ret = await remote.execute('sys.blockinfo', []);
        assert(!ret.error);
    });

    it('网络状态：查询网络概要信息', async () => {
        let ret = await remote.execute('sys.networkinfo', []);
        assert(!ret.error);
    });

    it('节点状态：查询对等节点概要信息', async () => {
        let ret = await remote.execute('sys.peerinfo', []);
        assert(!ret.error);
    });

    it('矿机状态：查询矿机概要信息', async () => {
        let ret = await remote.execute('sys.mininginfo', []);
        assert(!ret.error);
    });

    it('通证状态：查询通证概要信息', async () => {
        let ret = await remote.execute('sys.txoinfo', []);
        assert(!ret.error);
    });
    
    it('查询连接：查询当前连接数', async () => {
        let ret = await remote.execute('sys.connectioncount', []);
        assert(!ret.error);
    });
});
