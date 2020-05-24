//引入工具包
const toolkit = require('gamerpc')
const config = {
  type:   'testnet',
  ip:     '127.0.0.1',          //远程服务器地址
  head:   'http',               //远程服务器通讯协议，分为 http 和 https
  id:     'primary',            //默认访问的钱包编号
  apiKey: 'bookmansoft',        //远程服务器基本校验密码
  cid:    'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx', //授权节点编号，用于访问远程钱包时的认证
  token:  '03252fcf8061d221ad0a066d3e8447fd1e6184874a2fdc02eeced5c47d14bd8462', //授权节点令牌固定量，用于访问远程钱包时的认证
  structured: false,
};

function creator(options) {
  if(options) {
    for(let key of Object.keys(options)) {
      config[key] = options[key];
    }
  }

  //创建授权式连接器实例
  let remote = new toolkit.conn();
  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
  remote.setFetch(require('node-fetch'))  
  //设置连接串
  remote.setup(config);

  return remote;
}

module.exports = creator;