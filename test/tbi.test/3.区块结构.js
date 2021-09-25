/**
 * 可信区块链功能测试
 * 检验项目：
 *  (3). 区块结构
 * 测试目的：
 *  验证系统存储的区块结构
 *      1.披露区块数据结构，包括区块头、区块内容、交易结构等
 *      如下为区块数据结构
        {
            "hash": "d6b6d8167c918d6d8a4d6f5f7c87e329fd4a5ee688f1fa6dfa6826edcb3b9c58", //区块哈希
            "confirmations": 1,                 //确认数
            "strippedsize": 18964,              //尺寸(不包含隔离见证)
            "size": 19000,                      //尺寸
            "weight": 75892,                    //区块重量(签名量)
            "height": 0,                        //高度
            "version": 2,                       //版本
            "versionHex": "00000002",           //版本的HEX形式
            "merkleroot": "26ef3523fda7df5ba4d1aef19a08cd9e4974998912e6626db973aba272450797", //默克尔根
            "coinbase": "0042496e20746865206e616d65206f6620417468656e613a204f662074686520757365722c2042792074686520757365722c20616e6420466f722074686520757365722e0400000000080000000000000000", //coinbase数据
            "tx": [
                "17549c7cfb7739a970ee17f2c8ff23a830b7934e76ac3a94b8ead9ea36b2204b",
                "5be874897effc4be4af4b701fac98d035d2775505531ceb56a82cc114d48bbe5",
                "d266d9408b2b1bdad23f4689ae9ca16e107afca86a31f68375cf2016355296a1"
            ],                                  //打包交易的哈希值列表
            "time": 1567296000,                 //时间戳
            "mediantime": 1567296000,           //中位时间
            "bits": 521142271,                  //难度系数
            "nonce": 20190901,                  //随机数
            "difficulty": 9.53660673972713e-7,  //难度值，与难度系数成反比
            "chainwork": "0000000000000000000000000000000000000000000000000000000000001000", //工作量证明(累积难度值)
            "previousblockhash": null,          //上一个区块的哈希值
            "nextblockhash": null,              //下一个区块的哈希值
        }
        
        如下为交易数据结构
        { 
            "wid":              "钱包编号",
            "id":               "钱包名称",
            "hash":             "交易哈希",
            "height":           "交易高度",
            "block":            "区块哈希",
            "date":             "交易时间格式化串",
            "size":             "交易尺寸",
            "confirmations":    "确认数",
            "inputs": [ 
                { 
                    "value":    "输入数值",
                    "address":  "输入地址",
                } 
            ],
            "outputs": [ 
                { 
                    "value":    "输出数值",
                    "address":  "输出地址",
                } 
            ]
        }
 *      2.抓包或Log打印实际区块结果演示验证
 * 前置条件：
 *  确保各节点稳定运行
 * 测试流程：
 *  1. 连接节点1，发起一笔交易
 *  2. 指示节点1达成共识并形成新的区块
 *  3. 打印相关区块和交易的详细数据结构
 * 预期结果：
 *  1. 披露内容详尽，执行结果与预期披露一致
 */

//#region 引入SDK
const assert = require('assert')
const connector = require('../../lib/remote/connector')
const {notes} = require('../../lib/remote/common')
//#endregion

//#region 生成远程连接组件
const remoteA = connector({
    structured: true,
    ip: notes[0].ip,        //RPC地址
    port: notes[0].rpc,    //RPC端口
});
//#endregion

//#region 申明环境变量
let env = {};
//#endregion

describe('区块结构', () => {
    before(async () => {
        //通过SDK，以WS协议连接节点1，订阅指定消息
        remoteA.setmode(remoteA.CommMode.ws, async () => {});
        remoteA.watch(async msg => {
            //终端收到节点1推送的指定消息
            let block = remoteA.gamegold.chainentry.fromRaw(msg);
            let rt = await remoteA.execute('block.info', [remoteA.revHex(block.hash)]);
            //1. 打印区块信息
            console.log(`客户端收到订阅消息(type=block)`, rt.result);

            rt = await remoteA.execute('tx.get', [rt.result.tx[1]]);
            //2. 打印交易信息
            console.log(`查询交易信息`, rt.result);

        }, 'chain.connect');
        //@note setmode 仅仅是设置连接方式，设置后必须调用 execute 后才能真正建立长连接，也才能成功接收推送消息

        //订阅'chain'频道消息
        await remoteA.execute('chain.watch', []);
    });

    after(()=>{
        remoteA.close();
    });

    it('连接A节点, 发送交易', async () => {
        //通过SDK连接节点1并发送指令，生成一个有效地址
        let ret = await remoteA.execute('address.create', []);
        //断言指令执行成功
        assert(!ret.error);
        env.address = ret.result.address;

        //通过SDK连接节点1并发送指令，向该有效地址发送一笔交易
        console.log(`向地址${env.address}转账`);
        ret = await remoteA.execute('tx.send', [env.address, 1000000]);
        //断言指令执行成功
        assert(!ret.error);
    });

    it('发起共识流程', async () => {
        //通过SDK连接节点1，发出共识指令，确保交易上链
        console.log(`A节点发起共识流程，引发下行消息`);
        await remoteA.execute('miner.generate.admin', [1]);
        await remoteA.wait(3000);
    });
});
