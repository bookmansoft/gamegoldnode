# Vallnet

这是一个百谷王链示范项目，它通过 npm package 模式引入百谷王链核心并快速构建一个全节点应用

## 运行步骤

1. 部署环境

安装Node的指定版本: Nodejs@12.6.3, 安装过程中勾选'Automatically install the necessary tools'自动安装 Windows Chocolatey, python3.8.3 等辅助工具
**注意：14.x或更新版本对部分依赖库兼容性不佳，所以请安装指定版本，不要急于升级**

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

## API 接口文档

API 接口文档位于 docs 目录下

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
@注意：系统共识设定中，规定了100个包之后的挖矿奖励才能使用，因此必须挖出一定的区块，先前的区块奖励才能使用
