const toolkit = require('gamerpc')
const gamegold = require('gamegold');
const assert = require('assert')
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

/**
 * 校验应答签名
 * @param {*} ret 应答返回对象，注意连接器的 structured 必须设为 true, 否则返回对象不包括签名信息 
 * @returns 
 */
function verify(ret) {
  let priv = toolkit.hash256(Buffer.from(this.getTerminalConfig().token));
  let key = toolkit.generateKey(priv);
  return toolkit.verifyObj(ret.result, ret.sig, key.public);
}

/**
 * 解密加密信息
 * @param {*} encry 
 * @returns 
 */
function decryptToken (encry) {
  let {aeskey, aesiv} = this.getAes();
  return toolkit.decrypt(aeskey, aesiv, encry);
}

function revHex(data) {
  assert(typeof data === 'string');
  assert(data.length > 0);
  assert(data.length % 2 === 0);

  let out = '';

  for (let i = 0; i < data.length; i += 2)
    out = data.slice(i, i + 2) + out;

  return out;
};

function creator(options) {
  let cfg = Object.assign({}, config);

  if(options) {
    for(let key of Object.keys(options)) {
      cfg[key] = options[key];
    }
  }

  if(!cfg['token']) {
    let {token} = HDPrivateKey.getHmac(cfg.cid, !!cfg.hmacSalt ? Buffer.from(cfg.hmacSalt, 'hex') : encoding.DefaultChainCode);
    cfg['token'] = token;
  }

  //创建授权式连接器实例
  let remote = new toolkit.conn();
  //兼容性设置，提供模拟浏览器环境中的 fetch 函数
  remote.setFetch(require('node-fetch'))  
  //设置连接串
  remote.setup(cfg);

  remote.verify = verify.bind(remote);
  remote.revHex = revHex;
  remote.decryptToken = decryptToken.bind(remote);
  remote.gamegold = gamegold;
  
  return remote;
}

module.exports = creator;