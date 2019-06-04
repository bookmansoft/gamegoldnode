/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const uuid = require('uuid/v1')
const assert = require('assert');

//引入工具包
const toolkit = require('gamerpc')
//创建授权式连接器实例
const remote = new toolkit.conn();
remote.setFetch(require('node-fetch'))  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
.setup({
    type:   'testnet',
    ip:     '127.0.0.1',          //远程服务器地址
    head:   'http',               //远程服务器通讯协议，分为 http 和 https
    id:     'primary',            //默认访问的钱包编号
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'xxxxxxxx-game-gold-root-xxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
    token:  '03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08', //授权节点令牌固定量，用于访问远程钱包时的认证
    structured: true,
});

describe('厂商管理流程', () => {
    let cp = {};

    it('准备工作', async ()=>{
        await remote.execute('miner.setsync.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(500);
    });

    it('查询当前余额', async ()=>{
        let ret = await remote.execute('balance.all', []);
        cp.amountbefore = ret.result.unconfirmed;
    });

    it('创建一个厂商 - 名称太短', async ()=>{
        cp.name = 'abc'; //名称不合法

        let ret = await remote.execute('cp.create', [cp.name, null]);
        assert(ret.error);
    });

    it('创建一个厂商 - 名称太长', async ()=>{
        cp.name = '11111111111111111111111111111111111111111'; //名称不合法

        let ret = await remote.execute('cp.create', [cp.name, null]);
        assert(ret.error);
    });

    it('创建一个厂商 - 媒体分成太高', async ()=>{
        cp.name = uuid();   //修复名称
        cp.grate = 60;      //分成不合法

        let ret = await remote.execute('cp.create', [cp.name, null, null, null, cp.grate]);
        assert(ret.error);
    });

    it('创建一个厂商 - 媒体分成太低', async ()=>{
        cp.grate = -1;      //分成不合法

        let ret = await remote.execute('cp.create', [cp.name, null, null, null, cp.grate]);
        assert(ret.error);
    });

    it('创建一个厂商 - URL地址不合法', async ()=>{
        cp.grate = 15;          //修复分成
        cp.url = '127.0.0.1';   //URL不合法

        let ret = await remote.execute('cp.create', [cp.name, cp.url, null, null, cp.grate]);
        assert(ret.error);
    });

    it('创建一个厂商 - 分类信息不合法', async ()=>{
        cp.url = 'http://127.0.0.1';    //修复URL
        cp.cls = 's';                   //分类不合法

        let ret = await remote.execute('cp.create', [cp.name, cp.url, null, cp.cls, cp.grate]);
        assert(ret.error);
    });

    it('创建一个厂商 - IP地址不合法', async ()=>{
        cp.cls = 'slg';                 //修复分类
        cp.ip = '127.0.0';              //IP地址不合法

        let ret = await remote.execute('cp.create', [cp.name, cp.url, null, cp.cls, cp.grate, cp.ip]);
        assert(ret.error);
    });

    it('创建一个厂商 - 成功', async ()=>{
        cp.ip = '127.0.0.1';            //修复IP地址

        let ret = await remote.execute('cp.create', [cp.name, cp.url, null, cp.cls, cp.grate, cp.ip]);
        assert(!ret.error);

        cp.cid = ret.result.cid; //记录CP编码
    });

    it('手续费已扣除', async ()=>{
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(500); //手续费扣除有一定的延迟
        let ret = await remote.execute('balance.all', []);
        cp.amountafter = ret.result.unconfirmed;
        assert(cp.amountbefore - cp.amountafter > 100000000);
    });

    it('查询厂商信息', async () => {
        let ret = await remote.execute('cp.query', [[['cid', cp.cid]]]);
        assert(ret.result.list.length == 0);

        ret = await remote.execute('cp.remoteQuery', [[['cid', cp.cid]]]);
        assert(ret.result.list.length == 0);
    });

    it('信息记录上链', async () => {
        await remote.execute('miner.generate.admin', [1]);
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(500); //数据上链有一定的延迟
    });

    it('查询厂商信息', async () => {
        let ret = await remote.execute('cp.query', [[['cid', cp.cid]]]);
        assert(ret.result.list.length == 1);

        let rt = await remote.execute('cp.remoteQuery', [[['cid', cp.cid]]]);
        assert(rt.result.list.length == 1);
    });

    it('修改厂商名称 - 名称非法', async ()=>{
        cp.newName = 'ac';

        let ret = await remote.execute('cp.change', [cp.cid, cp.newName, cp.url, cp.ip, null, cp.grate, cp.cls]);
        assert(ret.error);
    });

    it('修改厂商分成比例 - 失败', async ()=>{
        cp.newName = uuid();    //修复名称
        cp.grate = 50;          //分成比例超限

        let ret = await remote.execute('cp.change', [cp.cid, cp.newName, cp.url, cp.ip, null, cp.grate, cp.cls]);
        assert(ret.error);
    });

    it('修改厂商分成比例 - 成功', async ()=>{
        cp.grate = 49;

        let ret = await remote.execute('cp.change', [cp.cid, cp.newName, cp.url, cp.ip, null, cp.grate, cp.cls]);
        assert(!ret.error);
    });

    it('修改厂商分类 - 成功', async ()=>{
        cp.cls = 'rpg';

        let ret = await remote.execute('cp.change', [cp.cid, cp.newName, cp.url, cp.ip, null, cp.grate, cp.cls]);
        assert(!ret.error);
    });

    it('查询厂商信息', async () => {
        let ret = await remote.execute('cp.remoteQuery', [[['name', cp.newName]]]);
        assert(ret.result.list.length == 0);
    });

    it('信息记录上链', async () => {
        await remote.execute('miner.generate.admin', [1]);
    });

    it('查询厂商信息', async () => {
        //数据上链有一定的延迟，因此延迟一段时间后再查询
        await (async function(time){return new Promise(resolve =>{setTimeout(resolve, time);});})(500); 

        let ret = await remote.execute('cp.remoteQuery', [[['name', cp.newName]]]);
        assert(ret.result.list.length == 1);
    });
});
