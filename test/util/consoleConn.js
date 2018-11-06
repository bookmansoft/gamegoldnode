/**
 * 控制台连接器，完整封装了客户端通过通过授权模式访问远程全节点的方法，依赖 gamegold 核心库
 * 可以直接用于 node 环境下的服务端程序，来访问远程全节点丰富的API接口
 */

const gamegold = require('gamegold')
const consoleConn = new gamegold.accessWallet({
    rpcHost: '127.0.0.1',                       //远程节点地址
    apiKey: 'bookmansoft',                      //简单校验密码
    network: 'testnet',                         //对等网络类型
    id: 'primary',                              //对接的钱包名称
    cid: '2c9af1d0-7aa3-11e8-8095-3d21d8a3bdc9',//特约生产者编码，用于全节点计算令牌固定量
    token: '03f6682764acd7e015fe4e8083bdb2b969eae0d6243f810a370b23ad3863c2efcd', //特约生产者令牌固定量，由全节点统一制备后，离线分发给各个终端
});

module.exports = consoleConn;