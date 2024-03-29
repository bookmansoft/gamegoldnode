;(function() {

'use strict';

//#region 基本设定和功能函数

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

window.onunhandledrejection = function(event) {
  throw event.reason;
};

var util = gamegold.util; //通用函数集合

var body = document.getElementsByTagName('body')[0];
body.onmouseup = function() {
  floating.style.display = 'none';
};

//将数值转为KB为单位
function kb(size) {
  size /= 1000;
  return size.toFixed(2) + 'kb';
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

//#region 日志窗口
var scrollback = 0;
var log = document.getElementById('log');

var logger = new gamegold.logger({ level: 'debug', console: true });
logger.writeConsole = function(level, module, args) {
  var name = gamegold.logger.levelsByVal[level];
  var msg = util.format(args, false);
  if (++scrollback > 1000) {
    log.innerHTML = '';
    scrollback = 1;
  }
  log.innerHTML += '<span style="color:blue;">' + new Date((util.now() + 8*3600)*1000).toISOString().replace(/T/g, ' ').replace(/\.[\d]{3}Z/, '') + '</span> ';
  if (name === 'error') {
    log.innerHTML += '<span style="color:red;">';
    log.innerHTML += '[';
    log.innerHTML += name
    log.innerHTML += '] ';
    if (module)
      log.innerHTML += '(' + module + ') ';
    log.innerHTML += '</span>';
  } else {
    log.innerHTML += '[';
    log.innerHTML += name
    log.innerHTML += '] ';
    if (module)
      log.innerHTML += '(' + module + ') ';
  }
  log.innerHTML += escape(msg) + '\n';
  log.scrollTop = log.scrollHeight;
};
//#endregion

//#region 弹窗
var floating = document.getElementById('floating');

floating.onmouseup = function(ev) {
  ev.stopPropagation();
  return false;
};

function showObject(obj) {
  floating.innerHTML = escape(util.inspectify(obj, false));
  floating.style.display = 'block';
}
//#endregion

//#region 钱包
var wdiv = document.getElementById('wallet');
var wtx = document.getElementById('wtx');

//列表所有钱包
function listWallet() {
  if(!defaultWalletId) {
    defaultWalletId = 'primary';
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
  wdb.get(defaultWalletId).then(wallet => {
    var html = '';
    var json = wallet.master.toJSON(true);
    var i, tx, el;
  
    html += `<b>[当前钱包]</b>${wallet.id}/${wallet.wid}<br>`;
    html += '当前地址: <b>' + wallet.getAddress() + '</b><br>';
    html += '地址私钥: <b>' + json.key.xprivkey + '</b><br>';
    //这个要提示用户妥善记录和保管
    html += '助 记 词: <b>' + json.mnemonic.phrase + '</b><br>';
  
    wallet.getBalance().then(function(balance) {
      html += '已定余额: <b>'
        + gamegold.amount.btc(balance.confirmed)
        + '</b><br>';
  
      html += '未定余额: <b>'
        + gamegold.amount.btc(balance.unconfirmed)
        + '</b><br>';
  
      return wallet.getHistory();
    }).then(function(txs) {
      return wallet.toDetails(txs);
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
  });
}

var newaddr = document.getElementById('newaddr');
//接口使用方式之一：调用钱包对象接口，生成一个新的地址，并重新生成钱包概要内容
newaddr.onmouseup = function() {
  wdb.primary.createReceive().then(function() {
    formatWallet();
  });
};

var newwallet = document.getElementById('newwallet');
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
    defaultWalletId = w.id;
    listWallet();
    formatWallet();
  }).catch(showObject);
};

var defaultWalletId = 'primary';
var selwallet = document.getElementById('selwallet');
selwallet.onchange = function() {
  defaultWalletId = selwallet.value;
  formatWallet();
};

//#endregion

//#region 近期区块和交易
var items = [];
var chainState = document.getElementById('state');
var tdiv = document.getElementById('tx');
function addBlock(item, entry) {
  var height = entry ? entry.height : -1;
  var el;

  if (items.length === 20) {
    el = items.shift();
    tdiv.removeChild(el);
    el.onmouseup = null;
  }

  el = createDiv('<a style="display:block;" href="#'
    + item.rhash() + '">' + item.rhash() + ' (' + height
    + ' - ' + kb(item.getSize()) + ')</a>');
  tdiv.appendChild(el);

  setMouseup(el, item);

  items.push(el);

  chainState.innerHTML = ''
    + 'tx=' + node.chain.db.state.tx
    + ' coin=' + node.chain.db.state.coin
    + ' value=' + gamegold.amount.btc(node.chain.db.state.value);
}
//#endregion

//#region 创建交易
var send = document.getElementById('send');
send.onsubmit = function(ev) {
  var value = document.getElementById('amount').value;
  var address = document.getElementById('address').value;
  var tx, options;

  options = {
    outputs: [{
      address: address,
      value: gamegold.amount.value(value)
    }]
  };

  wdb.primary.createTX(                     //创建交易
    options                                 //包含地址和金额的交易内容
  ).then(function(mtx) {                    //创建交易成功
    tx = mtx;                               //记录交易对象句柄
    return wdb.primary.sign(tx);            //开始签名，返回了一个Promise
  }).then(function() {                      //签名成功
    console.log('ready to convert: ', tx);  //显示 mutable tx
    tx = tx.toTX();                         //将 mutable tx 转化为 immutable tx
    console.log('ready to send: ', tx);     //显示 immutable tx
    return node.sendTX(tx);                 //发送交易到网络，返回了一个Promise
  }).then(function() {                      //发送成功
    showObject(tx);                               //显示交易内容
  });

  ev.preventDefault();
  ev.stopPropagation();

  return false;
};
//#endregion

//#region 远程命令
var rpc = document.getElementById('rpc');
//输入的指令字符串中，空格被当作分割符，因此即使是双引号包裹的内容也不要包含空格。
//命令实例如下，表示通过参数数组传递了一个参数，该参数是一个复合查询数组，只包括一个查询条件 ["name","ATHENA"]:
//cp.query.remote [[["name","ATHENA"]]]
var cmd = document.getElementById('cmd');

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
  node.rpc.execute({ method: method, params: params }, false, {options: {wid: defaultWalletId, cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}).then(showObject).catch(showObject);

  ev.preventDefault();
  ev.stopPropagation();

  return false;
};
//#endregion

//#region SPV节点

//构造并运行节点
var node = new gamegold.spvnode({
  hash: true,
  query: true,
  prune: true,
  db: 'leveldb',
  coinCache: 30000000,
  logConsole: true,
  workers: true,
  logger: logger,
  seeds: [`${commJson.outerIP}:${commJson.tcpPort}`],
  network: commJson.network,
  'http-remote-host': commJson.outerIP,
  proxy: commJson.outerIP,
  genesisParams: commJson.genesisParams,
});

//获取钱包容器对象
var wdb = node.use(gamegold.wallet.plugin);

//订阅事件 - 收到新的区块
node.chain.on('block', addBlock);

node.open().then(function() {
  return node.connect();
}).then(function() {
  node.startSync();
  listWallet();
  formatWallet();
}).catch(function(err) {
  throw err;
});
//#endregion
})();
