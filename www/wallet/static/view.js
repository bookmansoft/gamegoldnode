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
body.onmouseup = function() {
  floating.style.display = 'none';
};
//#endregion

//#region SPV节点
var util = gamegold.util; //通用函数集合
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
    listWallet();
    formatWallet();
  });
})().catch(err => {
  console.error(err.stack);
})

//#region 导航条
var page0, page1, page2;
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

  selwallet.innerHTML = '';

  wdb.getWallets().then(ids => {
    for(let id of ids) {
      if(id == defaultWalletId) {
        wdb.get(id).then(wallet => {
          wallet.removeAllListeners('balance');
          wallet.on('balance', formatWallet);
        })

        selwallet.innerHTML += `<option selected>${id}</option>`;
      } else {
        wdb.get(id).then(wallet => {
          wallet.removeAllListeners('balance');
        })

        selwallet.innerHTML += `<option>${id}</option>`;
      }
    }
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
  var json = defaultWallet.master.toJSON(true);
  var i, tx, el;

  html += `<b>[当前钱包]</b>${defaultWallet.id}/${defaultWallet.wid}<br>`;
  html += '当前地址: <b>' + defaultWallet.getAddress() + '</b><br>';
  html += '地址私钥: <b>' + json.key.xprivkey + '</b><br>';
  //这个要提示用户妥善记录和保管
  html += '助 记 词: <b>' + json.mnemonic.phrase + '</b><br>';

  defaultWallet.getBalance().then(function(balance) {
    html += '已定余额: <b>'
      + gamegold.amount.btc(balance.confirmed)
      + '</b><br>';

    html += '未定余额: <b>'
      + gamegold.amount.btc(balance.unconfirmed)
      + '</b><br>';

    return defaultWallet.getHistory();
  }).then(function(txs) {
      return defaultWallet.toDetails(txs);
  }).then(function(txs) {
    wdiv.innerHTML = html;

    wtx.innerHTML = '';
    for (i = 0; i < txs.length; i++) {
      tx = txs[i];
      el = createDiv('<a style="display:block;" href="#' + tx.hash + '">' + tx.hash + '</a>');
      wtx.appendChild(el);
      setMouseup(el, tx.toJSON());
    }
  });
}

var newaddr = document.getElementById('newaddr');
if(newaddr) {
  //接口使用方式之一：调用钱包对象接口，生成一个新的地址，并重新生成钱包概要内容
  newaddr.onmouseup = function() {
    defaultWallet.createReceive().then(function() {
      formatWallet();
    });
  };
}

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
    }, false, {options: {wid:'primary', cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(w => {
      navigator(w.id).then(wallet=>{
        listWallet();
        formatWallet();
      })
    }).catch(showObject);
  };
}

var selwallet = document.getElementById('selwallet');
if(selwallet) {
  selwallet.onchange = function() {
    navigator(selwallet.value).then(wallet=>{
      formatWallet();
    })
  };
}

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
    node.rpc.execute({ method: method, params: params }, false, {options: {wid:'primary', cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(showObject).catch(showObject);
  
    ev.preventDefault();
    ev.stopPropagation();
  
    return false;
  };
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
})();
