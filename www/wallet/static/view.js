;(function() {

'use strict';

//#region 通讯端口配置 
var commJson = {
  //外网地址
  outerIP: '127.0.0.1',
  //对等网络服务端口
  tcpPort: 2100,
  //远程代理服务端口
  wsport: 2104,
  //对等网络类型
  network: 'testnet',
  //创世参数
  genesisParams: {"testnetAddresses":"tb1qraxs23kt2e25vqda75ar7tu74spgp79uydp8h6,tb1q9jwv284q4s6v53w2elw376mv9vhywxcalvvy6d,tb1qx5rfdglg2s5xgzfcle0w92qmxfc2va40962c7u,tb1q87n5y76g20z8ch3tpvg2lddv4utp0tqk0fg6lh,tb1qdhjuwnrgfx37f6g0f79dhhakkhgu5sr2je9e6n,tb1q0sg06l6fjz8kgqmgkl3ep3flk6v848z5zqfgjj,tb1qjle37mptvmpgpt4rjtzgp0k4scjxdqdjjnd9pv,tb1qh6m8nk24535p9uznjpj22nhhe9mtrzaxe9pnyd,tb1qetv22rl9hhv5c9qzfn8rukp67a3a0n39hy43nl,tb1q63xh7684y5n8c2nywtxndw9crjs5awh4v0e2ek,tb1qa9sg9r0zwf4x6dxy8kyt3wzqq7ehj0aq64hgl8","coinbaseAddress":"tb1q9jwv284q4s6v53w2elw376mv9vhywxcalvvy6d","notifyAddress":"tb1qcjx9y0h27zs86mjd8a4syphyaq0njtwpxvk3sc"},
}
//#endregion

//#region 窗体基本设定
window.onunhandledrejection = function(event) {
  throw event.reason;
};
var body = document.getElementsByTagName('body')[0];
body.onmouseup = function(o) { //如果按下鼠标并在窗口外放开，则窗口自动隐藏
  if('floating' != o.toElement.className) {
    floating.style.display = 'none';
  }
};
//#endregion

//#region 钱包节点

//通用函数集合
var util = gamegold.util; 
//密钥对象
const KeyRing = gamegold.keyring;
//加解密助手
var cryptHelper = gamegold.hd.MnemonicHelper;
//钱包节点
var node = new gamegold.walletnode({
  config: true,
  argv: true,
  env: true,
  logFile: false,
  logConsole: true,
  logLevel: 'debug',
  db: 'leveldb',
  persistent: true,
  workers: false,
  listen: true,
  plugins: [
    gamegold.wallet.plugin,
  ],
  network: commJson.network,
  seeds: [`${commJson.outerIP}:${commJson.tcpPort}`],
  'http-remote-host': `${commJson.outerIP}`,
  proxy: commJson.outerIP,
  genesisParams: commJson.genesisParams,
});

//获取钱包容器对象
var defaultWalletId = getQueryString('wid');
if(defaultWalletId == 'undefined' || !defaultWalletId) {
  defaultWalletId = 'primary';
}
var wdb = node.require('walletdb');
var defaultWallet = null;

(async () => {
  await node.ensure();
  await node.open();

  navigator(defaultWalletId).then(()=>{
    //罗列游戏列表
    defaultWallet.getAddress()
    if(!!document.getElementById('CoreOfChick')) {
      let src = {
          cid: 'CoreOfChickIOS',  //配置目标服务器类型
          time: true,             //自动添加时间戳
      };

      //生成密钥管理对象
      defaultWallet.getKey(defaultWallet.getAddress()).then(key => {
        let ring = KeyRing.fromPrivate(key.privateKey);
        //设为隔离见证类型，这是因为 verifyData 中默认校验 bench32 类型的地址
        ring.witness = true; 
        //对数据对象进行签名，返回签名对象：打包了数据对象、公钥、地址和签名
        let signedData = ring.signData(src); 
        //序列化签名对象，生成可登录链接
        signedData.data.sig = signedData.sig;
        document.getElementById('CoreOfChick').href = "http://127.0.0.1:5033/index.html?openid=authgg." + signedData.data.addr + "&auth=" + JSON.stringify(signedData.data);
      });
    }

    listWallet();
    formatWallet();
    if(props) {
      formatProps();
    }
    if(cps) {
      listCps();
    }
  });
})().catch(err => {
  console.error(err.stack);
})

//#region 导航条
var page0, page1, page2, page3, page4, page5, page6;
function navigator(wid) {
  defaultWalletId = wid;

  page0 = document.getElementById('page0');
  if(page0) {
    page0.href = 'index.html?wid=' + defaultWalletId;
  }
  page1 = document.getElementById('page1');
  if(page1) {
    page1.href = 'trans.html?wid=' + defaultWalletId;
  }
  page2 = document.getElementById('page2');
  if(page2) {
    page2.href = 'cmd.html?wid=' + defaultWalletId;
  }
  page3 = document.getElementById('page3');
  if(page3) {
    page3.href = 'issue.html?wid=' + defaultWalletId;
  }
  page4 = document.getElementById('page4');
  if(page4) {
    page4.href = 'cp.html?wid=' + defaultWalletId;
  }
  page5 = document.getElementById('page5');
  if(page5) {
    page5.href = 'prop.html?wid=' + defaultWalletId;
  }
  page6 = document.getElementById('page6');
  if(page6) {
    page6.href = 'faq.html?wid=' + defaultWalletId;
  }

  return wdb.get(defaultWalletId).then(wallet=>{
    defaultWallet = wallet;
    return defaultWallet;
  });
}
//#endregion

//#region 钱包
var wdiv = document.getElementById('wallet');
var wtx = document.getElementById('wtx');

//列表所有钱包
function listWallet() {
  if(!wdiv) {
    return false;
  }

  //清空钱包选择栏信息
  selwallet.innerHTML = '';

  wdb.getWallets().then(ids => {
    for(let id of ids) {
      wdb.get(id).then(function(w) {
        w.removeAllListeners('balance');

        if(w.id == defaultWalletId) {
          w.on('balance', formatWallet);
          //添加钱包选择栏选项，显示钱包名称和编号，并将默认钱包标定为选中
          selwallet.innerHTML += `<option selected value="${w.id}">${w.id}/${w.wid}</option>`;
        } else {
          //添加钱包选择栏选项
          selwallet.innerHTML += `<option value="${w.id}">${w.id}/${w.wid}</option>`;
        }
      })
    }
  })
}

//切换钱包
var selwallet = document.getElementById('selwallet');
if(selwallet) {
  selwallet.onchange = function() {
    navigator(selwallet.value).then(wallet=>{
      formatWallet();
    })
  };
}

//导入助记词，注意导入信息包括助记词和衍生盐
function importMnemonic() {
  let dec = cryptHelper.decrypt({
    password: 'helloworld',
    body: document.getElementById('mnemonictext').value,
  });

  (async () => {
    for(let item of JSON.parse(dec)) {
      await wdb.rpc.execute({ method: 'wallet.importmnemonic.admin', params: [
        cryptHelper.encrypt({
          body: JSON.stringify(item.mnemonic),
          password: 'helloworld',
        }),
        'helloworld',
      ]}, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(showObject).catch(showObject);
    }

    listWallet();
  })();
}

//显示所有钱包的助记词
function showMnemonic() {
  wdb.getWallets().then(ids => {
    var pros = [];
    for(let id of ids) {
      pros.push(wdb.get(id).then(function(w) {
        //记录助记词信息
        mnemonic.push({id: w.id, mnemonic: {
          phrase: w.master.mnemonic.getPhrase(),     //存储助记符的单词序列
          language: w.master.mnemonic.language,      //存储助记符的语言类型
          passphrase: w.master.mnemonic.passphrase,  //存储助记符的衍生盐
        }});
      }));
    }

    var mnemonic = [];
    //并发处理所有Promise, 全部处理完成后显示助记词完整列表
    Promise.all(pros).then(function() {
      //对助记词数组进行加密处理后再显示，本示范程序直接使用密码'helloworld'
      let enc = cryptHelper.encrypt({
        password: 'helloworld',
        body: JSON.stringify(mnemonic),
      });
      document.getElementById('mnemonictext').value = enc;
      //注: 实际应用中，将enc以二维码方式呈现，后期用户可以扫码读入这个字符串，用原始密码就可以恢复助记词数组

      // console.log(cryptHelper.decrypt({
      //   password: 'helloworld',
      //   body: enc,
      // }));
    });
  })
}

//格式化钱包信息，显示在指定区域。使用 select 控件列表全部钱包，选定后设为当前钱包
function formatWallet() {
  if(!wdiv) {
    return false;
  }

  if(!defaultWalletId) {
    defaultWalletId = 'primary';
    defaultWallet = wdb.primary;
  }

  var html = '';
  var i, coin, el;

  html += '区块高度: <b>' + wdb.state.height + '</b><br>';
  html += '当前地址: <b>' + defaultWallet.getAddress() + '</b><br>';

  let balance = {confirmed: 0.0, unconfirmed: 0.0};

  wdb.rpc.execute({ method: 'coin.list', params: [0] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(function(ret) {
    wtx.innerHTML = '<div>硬币列表:</div>';
    for (i = 0; i < ret.length; i++) {
      coin = ret[i];
      balance.unconfirmed += util.fromFloat(coin.amount, 8);
      if(coin.confirmations>0) {
        balance.confirmed += util.fromFloat(coin.amount, 8);
      }
      el = createDiv('<a style="display:block;" href="#' + coin.txid + '.' + coin.vout + '">' + (coin.confirmations<=0?'(未)':'') + coin.amount + ':' + coin.txid + '.' + coin.vout + '</a>');
      wtx.appendChild(el);
      setMouseup(el, JSON.stringify(coin));
    }

    html += '已定余额: <b>' + gamegold.amount.btc(balance.confirmed) + '</b><br>';
    html += '未定余额: <b>' + gamegold.amount.btc(balance.unconfirmed) + '</b><br>';

    wdiv.innerHTML = html;
  }).catch(showObject);
}

//生成新地址
var newaddr = document.getElementById('newaddr');
if(newaddr) {
  //接口使用方式之一：调用钱包对象接口，生成一个新的地址，并重新生成钱包概要内容
  newaddr.onmouseup = function() {
    defaultWallet.createReceive().then(function() {
      formatWallet();
    });
  };
}

//生成新钱包
var newwallet = document.getElementById('newwallet');
if(newwallet) {
  //接口使用方式之一：调用RPC接口，生成一个新的钱包，并重新生成钱包概要内容
  newwallet.onmouseup = function() {
    wdb.rpc.execute({
      method:'wallet.create', 
      params: [
        null,
        'pubkeyhash',       //Type of wallet (pubkeyhash, multisig) (default=pubkeyhash).
        1,                  //`m` value for multisig.
        1,                  //`n` value for multisig.
        null,               //mnemonic phrase to use to instantiate an hd private key for wallet
        null,               //passphrase to encrypt wallet
        null,               //Master HD key. If not present, it will be generated.
        true,               //Whether to use witness programs.
        false,              //set true to create a watch-only wallet
        null,               //public key used for multisig wallet
      ]
    }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(w => {
      navigator(w.id).then(wallet=>{
        listWallet();
        formatWallet();
      })
    }).catch(showObject);
  };
}

//导出钱包信息
var showmnemonic = document.getElementById('showmnemonic');
if(showmnemonic) {
  showmnemonic.onclick = showMnemonic;
}
var importmnemonic = document.getElementById('importmnemonic');
if(importmnemonic) {
  importmnemonic.onclick = importMnemonic;
}

//和主链同步
var syncwallet = document.getElementById('syncwallet');
if(syncwallet) {
  syncwallet.onclick = syncWallet;
}
function syncWallet() {
  //调用节点RPC接口，执行用户输入的命令
  wdb.rpc.execute({ method: 'sys.rescan', params: [0] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(function(ret){
    //为了正确显示区块同步高度，扫码完成后延迟5秒再刷新下钱包信息
    (async (time) => {return new Promise(resolve => {setTimeout(function() {
      formatWallet();    
      resolve();
    }, time);});})(5000);
  }).catch(showObject);
};
//#endregion

//#region 创建交易
var send = document.getElementById('send');
if(!!send) {
  send.onsubmit = function(ev) {
    var value = document.getElementById('amount').value;
    var address = document.getElementById('address').value;
    var tx, options;
  
    options = {
      rate: 10000,
      outputs: [{
        address: address,
        value: gamegold.amount.value(value)
      }]
    };
  
    defaultWallet.createTX(                     //创建交易
        options                                 //包含地址和金额的交易内容
    ).then(function(mtx) {                    //创建交易成功
      tx = mtx;                               //记录交易对象句柄
      return defaultWallet.sign(tx);            //开始签名，返回了一个Promise
    }).then(function() {                      //签名成功
      console.log('ready to convert: ', tx);  //显示 mutable tx
      tx = tx.toTX();                         //将 mutable tx 转化为 immutable tx
      console.log('ready to send: ', tx);     //显示 immutable tx
      return wdb.send(tx);               //发送交易到网络，返回了一个Promise
    }).then(function() {                      //发送成功
      showObject(tx);                               //显示交易内容
    });
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}
//#endregion

//#region 执行远程命令
// 输入的指令字符串中，空格被当作分割符，因此即使是双引号包裹的内容也不要包含空格。
// 命令实例如下，表示通过参数数组传递了一个参数，该参数是一个复合查询数组，只包括一个查询条件 ["name","ATHENA"]:
// cp.query.remote [[["name","ATHENA"]]]
// ca.list [[["erid","49315e0921301f4585597a25c0a2936b1b2602fc02aed7adddfc38ad7a39c5f9"]]]
var cmd = document.getElementById('cmd');
var rpc = document.getElementById('rpc');
if(rpc) {
  rpc.onsubmit = function(ev) {
    var text = cmd.value || '';
    var argv = text.trim().split(/\s+/);
    var method = argv.shift();
    var params = [];
    var i, arg, param;
  
    cmd.value = '';
  
    for (i = 0; i < argv.length; i++) {
      arg = argv[i];
      try {
        param = JSON.parse(arg);
      } catch (e) {
        param = arg;
      }
      params.push(param);
    }
  
    //调用节点RPC接口，执行用户输入的命令
    wdb.rpc.execute({ method: method, params: params }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(showObject).catch(showObject);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}
//#endregion

//#region 通用存证, 注意提交通用存证后，要等待上链成功才能通过 ca.list 指令查询
var issueForm = document.getElementById('issueForm');
if(!!issueForm) {
  issueForm.onsubmit = function(ev) {
    var value = document.getElementById('issue').value;
    var address = document.getElementById('addressIssue').value;
    var hash = gamegold.crypto.digest.hash256(Uint8Array.from(value)).toString('hex');

    //调用节点RPC接口，执行用户输入的命令
    wdb.rpc.execute({ method: 'ca.issue.public', params: [
      {
        hash,                         //存证哈希
        height: 0,                    //有效高度
      },
      address,                        //见证地址
    ] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(ret=>{
      if(!ret.error) {
        console.log('issue.erid:', ret.erid);
      }
      showObject(ret);
    }).catch(showObject);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}
//#endregion

//#region 管理CP, 注意注册后，要等待上链成功才能通过 cp.byName 指令查询
var cpForm = document.getElementById('cpForm');
if(!!cpForm) {
  cpForm.onsubmit = function(ev) {
    var value = document.getElementById('cp').value;

    //调用节点RPC接口，执行用户输入的命令
    wdb.rpc.execute({ method: 'cp.create', params: [
      value,
      '127.0.0.1',
    ] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(ret=>{
      if(!ret.error) {
        console.log('cp.id:', ret.cid);
      }
      showObject(ret);
    }).catch(showObject);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}
var cpQuery = document.getElementById('cpQuery');
if(cpQuery) {
  cpQuery.onclick = function(){
    var val = document.getElementById('cp').value;
    if(!!val) {
      //调用节点RPC接口，执行用户输入的命令
      wdb.rpc.execute({method: 'cp.query.remote', params: [
        [[['name', val]]],
      ]}, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(ret=>{
        showObject(ret);
      }).catch(showObject);
    }
  }
}
//#endregion

//#region 道具管理, 注意注册后，要等待上链成功才能通过 prop.byid 指令查询

//列表所有本地CP
function listCps() {
  console.log('current wallet', defaultWallet.id);
  if(!cps) {
    return false;
  }

  //清空钱包选择栏信息
  cps.innerHTML = '';

  wdb.rpc.execute({ method: 'cp.query', params: [] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(ret => {
    for(let item of ret.list) {
      if(item.owned) {
        cps.innerHTML += `<option value="${item.cid}">${item.name} / ${item.cid}</option>`;
      }
    }
  })
}

//切换CP
var cps = document.getElementById('cps');
if(cps) {
  cps.onchange = function() {
    document.getElementById('cpid').value = cps.value;
  };
}

//铸造道具
var propForm = document.getElementById('propForm');
if(!!propForm) {
  propForm.onsubmit = function(ev) {
    var cpid = document.getElementById('cpid').value;
    var pid = document.getElementById('prop').value;

    //调用节点RPC接口，执行用户输入的命令
    wdb.rpc.execute({ method: 'prop.create', params: [
      cpid,
      pid,    //暂时使用 pid 填充 oid
      10000,
      pid,
    ] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(ret=>{
      if(!ret.error) {
        console.log('prop.id:', ret.pid);
      }
      showObject(ret);
    }).catch(showObject);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}

//熔铸道具
var foundForm = document.getElementById('foundForm');
if(!!foundForm) {
  foundForm.onsubmit = function(ev) {
    var pid = document.getElementById('foundPid').value;

    //调用节点RPC接口，执行用户输入的命令
    wdb.rpc.execute({ method: 'prop.found', params: [
      pid,
    ] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(showObject).catch(showObject);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}

//转赠道具
var sendProp = document.getElementById('sendProp');
if(!!sendProp) {
  sendProp.onclick = function() {
    var pid = document.getElementById('foundPid').value;
    var address = document.getElementById('sendAddress').value;

    //调用节点RPC接口，执行用户输入的命令
    wdb.rpc.execute({ method: 'prop.send', params: [
      address,
      pid,
    ] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(showObject).catch(showObject);
  
    return false;
  };
}

//道具列表
var curPage = 1, maxPage = 1;
var props = document.getElementById('props');
var prop_pageup = document.getElementById('prop_pageup');
if(prop_pageup) {
  prop_pageup.onclick = function() {
    curPage = ++curPage % maxPage;
    if(curPage == 0) {
      curPage = maxPage;
    }
    formatProps();
  }
}
function formatProps() {
  wdb.rpc.execute({ method: 'prop.query', params: [
    [['page', curPage], ['pid', 'notlike', '-vallnet-boss-']],
  ] }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(ret=>{
    props.innerHTML = '';
    for (let i = 0; i < ret.list.length; i++) {
      maxPage = ret.page;

      var el = createDiv('<a style="display:block;" href="#' + ret.list[i].pid + '">' + ret.list[i].pid + '</a>');
      props.appendChild(el);
      let item = ret.list[i];
      el.onmouseup = function(ev) {
        document.getElementById('foundPid').value = item.pid;

        showObject(JSON.stringify(item));
        ev.stopPropagation();
        return false;
      };
    }
  }).catch(showObject);
}
//#endregion

//#region 功能函数

//获取路径代码
function getQueryString (name) {
  var reg = new RegExp('(^|&)' + name + '=([^&]*)(&|$)','i');
  var r = window.location.search.slice(1).match(reg);
  
  if (r != null) {
    return decodeURIComponent(r[2]);
  }
  
  return null;
}

function showObject(obj) {
  floating.innerHTML = escape(util.inspectify(obj, false));
  floating.style.display = 'block';
}

//创建一个DIV容器
function createDiv(html) {
  var el = document.createElement('div');
  el.innerHTML = html;
  return el.firstChild;
}

//实体符号转换
function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function setMouseup(el, obj) {
  el.onmouseup = function(ev) {
    showObject(obj);
    ev.stopPropagation();
    return false;
  };
}
//#endregion

//#region 支持模糊匹配的问答功能, 可以根据用户任意输入智能匹配Faq列表中的问题项，从而展示最佳答案

//预设的问题和答案列表
const Faq = {
  '如何注销登录？':'注销登录：为用户账户使用和安全考虑，用户可注销当前登录账户。下次登录时需要重新登录。',
  '如何反馈意见？':'意见反馈：用户在系统使用中有任何意见或建议均可在意见反馈中提，工作人员会依据用户的有效反馈加以采纳以便后期系统完善工作。',
  '如何修改密码？':'密码修改：用于用户对当前密码不认可，从而可以进行新密码的设定。更有利于账户的安全。修改密码时，输入旧密码、输入两次新密码，提交修改即新密码设定成功。',
  '获取不到验证码?':'1.验证码获取次数太频繁，会导致收取验证码不及时或者收不到。可联系客服咨询是否有发送验证码。并告知验证码，发送的验证码都是5分钟内有效的。2.有些原因回事运营商的问题，需要用户电话联系运营商确认。',
  '关于系统bug问题':'可在个人中心---意见反馈中提交意见反馈。',
};

var faq = document.getElementById('faq');
var answer = document.getElementById('answer');
if(faq) {
  faq.onsubmit = function(ev) {
    var text = answer.value || '';
    answer.value = '';

    //获取可能的答案排序, 最多显示三条
    let list = GetAnswer(text.replace('?', '？').trim());
    console.log(list);
    let recy = 0, ret = [];
    for (let item of list) {
      if (recy == 0) {
        ret.push(`【最佳】${item.k}【解答】${Faq[item.k]}`);
      } else if (recy < 3 && item.v > 0) {
        ret.push(`【其它】${item.k}【解答】${Faq[item.k]}`);
      } else {
        break;
      }
      recy++;
    }
  
    showObject(ret);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
}

/**
 * 匹配最合适的问题，并返回对应的回答
 * @param question
 * @returns {Array[Object]}
 */
function GetAnswer(question) {
  if (question == null || question.length == 0) {
    return [];
  }

  if (Object.keys(Faq).includes(question)) {
    return [{k: question, v: 100}];
  }

  let list = [];
  let maxValue = 0;
  for (let key of Object.keys(Faq)) {
    let cur = {v: 0, k: key};

    let temp = question;
    while (temp.length > 0) {
      let str = '';
      for (let word of temp) {
        str += word;

        cur.v += GetRelation(str, key);
        if (cur.v > maxValue) {
          maxValue = cur.v;
        }
      }
      if (temp.codePointAt(0) > 0xFFFF) {
        temp = temp.substring(2);
      }
      else {
        temp = temp.substring(1);
      }
    }
    list.push(cur);
  }

  list.sort((a, b) => {
    return b.v - a.v;
  });

  return list;
}

/**
 * 返回两个词之间的熵值
 * @param word1
 * @param word2
 * @returns {number}
 */
function GetRelation(word1, word2) {
  let l1 = word2.match(new RegExp(word1, "g"));
  let l2 = word1.match(new RegExp(word2, "g"));
  return (l1 == null ? 0 : l1.length * word1.length) + (l2 == null ? 0 : l2.length * word2.length);
}
//#endregion
})();
