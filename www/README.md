# 百谷王收藏家POC项目

## 基本描述

百谷王收藏家(valletBrowserWallet)是基于百谷王链的数字资产管理软件，可以运行在浏览器上，或者集成于其它项目中。

项目文件清单如下：

- wallet (轻钱包, 当前主要运用模式, 可确保私钥本地保存，具备交易自主性和一定的安全性)
-   static/gamegold.js:
-   static/view.js:
-   index.html: 
-   cmd.html: 多个分功能示范页面之一，不一一列举

- spv (SPV钱包, 安全级别总体上高于轻钱包, 但目前仅做示范，作为备用运用模式)
-   static/gamegold.js: 通过 webpack-browser 打包的节点逻辑代码
-   static/view.js: 给出了界面操作示范代码，可按照其基本模式，将相关功能集成至基于VUE框架的应用中
-   index.html: 网站入口，可以直接从外部资源管理器中点击运行，或架设Web Server通过IP访问，适用于Chrome兼容浏览器

SPV钱包界面说明：
1. 界面包括功能陈列区、钱包信息区、日志区、近期交易列表等，有一个简单的弹窗用于信息查看。
2. 功能区包括若干相互独立的功能，例如：
- 输入地址、金额，点击'发送交易', 即可成功生成并发送一笔交易
- 在提示'输入任意指令回车执行'文本框内，输入完整的地址和附加参数，回车后即可在弹窗中看到返回信息，点击空白处弹窗自动消失
3. 钱包区展示当前激活钱包的基本信息。可以生成新的钱包，也可以在不同钱包间切换. 点击'生成新地址', 即可在当前钱包内，生成一个全新的地址。钱包也展示和其相关的交易列表，可点击交易条目，通过弹窗查看细节。
3. 日志区展示所有和系统交互的日志信息
4. 近期交易列表显示最近收到的区块，可点击条目，通过弹窗查看细节

Wallet钱包界面说明：
1. 结构大体同SPV, 对功能区做了拆分，移除了日志窗口

和系统交互的几种基本方式：

1. 直接调用节点内置对象的各个方法。需要了解系统对象体系
```js
//取得钱包管理器
var wdb = node.use(gamegold.wallet.plugin);
//调用基础钱包对象的 createReceive 方法，生成一个新的地址
wdb.primary.createReceive().then(() => {});
```

2. 利用节点开放的RPC接口，进行各类功能调用。这个方法通用性较强，同时不需要对系统对象体系有深入了解
```js
wdb.rpc.execute(
    { method: 'sys.rescan', params: [0] }, 
    false, 
    {options: {wid: 'primary', cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}}
).then(showObject).catch(showObject);
```

3. 订阅系统事件，交由事件句柄做后续处理
```js
wdb.primary.on('balance', ret => {}));
```

## 调测报告 2023.02.08

1. IP.isValid
系统为了避免闭环连接，对本地地址访问做了限制，这样就无法用WS代理连接自身了. 为方便单机测试，对此做了临时调整:
```js
IP.isRoutable() {
    // 暂时屏蔽了如下判断
    // if (IP.isLocal(raw))
    //   return false;
}
```

2. 钱包的 wid 和 id
钱包对象 wallet 的属性中, id 其实是钱包的'名称'，而 wid 才是钱包的数字索引。但在接口调用时，上传的 wid 参数却必须是 wallet.id, 这个地方太容易让人迷惑了

3. 关于 RPC
通过内置对象调用RPC时，要注意有两个RPC接口对象，调用方式示范如下:
```js
let cmd_obj = {method: 'something', params: {}};
//在通过通讯组件进行的远程调用中, req_obj 是自动构造的。直接调用时需要手工构造传递，否则将报错而无法执行命令
let req_obj = {options: {wid:'primary', cid: 'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx'}};

//链库RPC调用，注意该模式在轻钱包中不可用
node.rpc.execute(cmd_obj, false, req_obj);

//钥库RPC调用
wdb.rpc.execute(cmd_obj, false, req_obj);
```

3. 架设网站

在 ./index.js 中添加了静态网站相关代码，同时新增了 ./www 目录统一存放钱包节点相关资源

```js
//#region 添加静态网站 http://127.0.0.1/920
webstatic('http', node.config.str('wshost'), 2009, [
    {path: '/', dir: './www/wallet'},   //轻钱包，密钥本地存储
    {path: '/spv', dir: './www/spv'},   //SPV钱包，密钥本地存储，默克尔树校验交易
]);
//#endregion
```

节点运行后，通过浏览器访问如下地址，使用钱包各项功能:
```bash
# 轻钱包访问地址
http://outerIP:2009/

# SPV钱包访问地址
http://outerIP:2009/spv

```

## 轻钱包使用说明

### 钱包 index.html

#### 多钱包管理
1. 全新运行轻钱包节点，用[创建新的钱包]功能生成一个新钱包，这样算上primary一共有两个钱包。可以通过下拉框切换钱包
2. 点击[新增地址]可以为选定钱包生成新的地址。
3. 通过控制台，从中心节点向这两个钱包的当前地址，各自转入一笔金额(tx send address amount)，使其各具备 1BNC 余额
4. 使用[导出备份]功能，导出加密字符串，实际应用中可形成二维码图片存储于本地
4. 删除当前wallet节点数据库(chrome浏览器下F12 -> Application -> IndexedDb)，重新运行，此时该节点只有一个钱包primary
5. 输入加密字符串，使用[导入备份]功能导入备份信息，此时该节点应该有三个钱包。实际应用中可通过扫码二维码录入
6. 运行 sys.rescan 0, 此时除primary以外，新导入的两个钱包应该各有1BNC

测试中出现的问题
- 由于仅仅导入 mnemonic.phrase 而没有导入 mnemonic.passphrase, 导致导入失败, 修改后恢复正常

