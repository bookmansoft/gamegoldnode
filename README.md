# gamegoldnode

这是一个游戏金全节点示范项目，它通过 npm package 模式引入游戏金核心，从而快速构建了一个全节点应用。

## 运行步骤

1、克隆代码库
```bash
git clone https://github.com/bookmansoft/gamegoldnode
```

2、安装依赖
```bash
npm i
```

3、运行全节点
```bash
npm start
```

4、可选依赖安装
```bash
npm i mocha -g
```

## API 接口文档

API 接口文档位于 docs 目录下，注意示例中使用的是 bitpay 官网API地址

## 单元测试

单元测试位于test目录下，运行指令：
```bash
mocha
```

单元测试展示了 GET POST JSONP 三类API的调用方式，以及WS下接收订阅消息的方式
可以在 describe 或 it 后增加 ".only" 或 ".skip" 来选择性测试

## 常用控制台指令

注意：必须先在一个控制台窗口中运行 npm start , 启动全节点后，才能在另外一个控制台窗口中，执行下述命令

### 调用挖矿流程，生成 100 个新的区块
```bash
npm run cli rpc generate 100
```
@注意：系统共识设定中，规定了100个包之后的挖矿奖励才能使用，因此必须挖出一定的区块，先前的区块奖励才能使用

### 生成一个新的地址
```bash
npm run cli rpc address.create
```

```json
{
  "network": "testnet",
  "wid": 1,
  "id": "primary",
  "name": "default",
  "account": 0,
  "branch": 0,
  "index": 14,
  "witness": true,
  "nested": false,
  "publicKey": "0267dd32600a5bdac2bd425a67e1a3c191cf772ff15907ee8542d41294fcd2a813",
  "script": null,
  "program": "001477f678aed1c374ede131a9ab1e4f2eb5c258639a",
  "type": "witness",
  "address": "tb1qwlm83tk3cd6wmcf34x43unewkhp9scu6x9x3l7"
}
```

### 向一个地址转账
```bash
npm run cli rpc tx.send tb1qwlm83tk3cd6wmcf34x43unewkhp9scu6x9x3l7 1000
```
@注意：金额单位为聪，不能太小，如果显示余额不足，则执行 npm run cli rpc generate 100 进行充值
@地址可以使用 npm run cli rpc address.create 指令生成