# gamegoldnode

这是一个百谷王链示范项目，它通过 npm package 模式引入百谷王链核心并快速构建一个全节点应用，并提供配套命令行工具

## 运行步骤

1. 部署环境

安装Node的指定版本: Nodejs@12.20.0, 安装过程中勾选'Automatically install the necessary tools'自动安装 Windows Chocolatey, python3.9.1 等辅助工具
**注意：对14.x或更高版本的依赖库兼容性测试尚未完成，所以务请安装指定版本**

安装Git工具: Git 2.28.0 64-bit version for Windows

2. 克隆代码库

在专门的项目管理文件夹根目录执行如下命令：

```bash
git clone https://github.com/bookmansoft/gamegoldnode
```

3. 配置项目

```bash
# 进行项目目录
cd gamegoldnode
# 安装依赖项
npm i
# 将 vc 指令和行命令程序挂接
npm link
```

3. 运行全节点

```bash
npm start
```

## 常用控制台指令

@note 必须先在一个控制台窗口中运行 npm start , 启动全节点后，才能在另外一个控制台窗口中执行命令

```bash
# 获取节点RPC接口列表
vc help
# 获取行命令工具常用命令列表
vc ?
# 调用挖矿流程，生成 100 个新的区块
vc miner.generate.admin 100
# 生成bookman账号，同时获取该账号下的一个新地址 tb1q0h3thutw4jl6hrse59493nkeg36he7dkgnt8lg
vc address.create bookman
# 接口的金额单位使用Dust(尘)，系统内部使用VC(维, 1维=10^8尘)，可执行 vc miner.generate.admin 10 进行充值
vc tx.send tb1q0h3thutw4jl6hrse59493nkeg36he7dkgnt8lg 1000
# 查询指定账户地址余额
vc balance.all bookman
```
@注意：系统共识设定中设定了记账奖励成熟度阀值，当前规定区块高度提升100后，先前的记账奖励才能使用

## 接口说明文档

接口说明文档位于 ./docs

## SPV钱包线上参数配置(以main网络为例)

***注: innerIP 指目标服务器内网地址, outerIP 指目标服务器对外展示的虚拟地址***

./.gamegold/main/gamegold.conf
```bash
wshost: innerIP
```

./index.js: 
```js
new FullNode({
  wshost: `${innerIP}`,     //当前节点提供代理服务的守护地址
  wsport: '2004',           //当前节点提供代理服务的守护端口
})
//静态网站服务的守护地址和端口
webstatic('http', `${innerIP}`, 2009, [
  {path: '/', dir: './www'},
]);
```

./static/view.js: 
```js
new gamegold.spvnode({
  network: 'main',                          //网络类型
  seeds:
  [
    `${outerIP}:2000`,                      //透过代理服务器实际连接的远程服务器的地址
  ],
  'http-remote-host': `${outerIP}`,         //提供开放式RPC调用接口的远程服务器的地址
  proxy: `${outerIP}`,                      //代理服务器地址
  wsport: '2004',                           //代理服务器端口
  genesisParams: {"mainAddresses":"..."},   //必须和创世参数保持一致
})
```