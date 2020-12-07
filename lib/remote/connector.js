const toolkit = require('gamerpc')
const gamegold = require('gamegold');
const util = gamegold.util;
const encoding = gamegold.encoding;
const HDPrivateKey = gamegold.hd.PrivateKey;

const config = {
  type:       'testnet',
  ip:         '127.0.0.1',            //远程服务器地址
  head:       'http',                 //远程服务器通讯协议，分为 http 和 https
  id:         'primary',              //默认访问的钱包编号
  apiKey:     'bookmansoft',          //远程服务器基本校验密码
  cid:        gamegold.consensus.ROOT,//授权节点编号，用于访问远程钱包时的认证
  token:      null,                   //授权节点令牌固定量，用于访问远程钱包时的认证
  structured: false,
};

function creator(options) {
  let cfg = Object.assign({}, config);

  if(options) {
    for(let key of Object.keys(options)) {
      cfg[key] = options[key];
    }
  }

  if(!cfg['token']) {
    let {token} = HDPrivateKey.fromKey(Buffer.from(encoding.ONE_HASH, 'hex'), Buffer.from(encoding.DefaultChainCode, 'hex'), cfg.type).getHMAC(util.hashInt(cfg.cid));
    cfg['token'] = token;
  }

  //创建授权式连接器实例
  let remote = new toolkit.conn();
  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
  remote.setFetch(require('node-fetch'))  
  //设置连接串
  remote.setup(cfg);
  remote.wait = async function (time) {
    await (async (time) => {return new Promise(resolve => {setTimeout(resolve, time);});})(time);
  }
  
  return remote;
}

module.exports = creator;