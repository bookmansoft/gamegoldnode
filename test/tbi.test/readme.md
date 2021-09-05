# 测试用例操作规程V1.1

***百谷王科技刘兵 2021.08.31***

## 操作流程

1. 登录IP白名单允许的公网服务器

2. 为此服务器部署 mocha@5.2.0 vscode nodejs@14.16.0 git 等工具

3. 为此服务器部署 https://github.com/bookmansoft/gamegoldnode 项目

4. 打开CMD窗口，转至项目主目录

5. 批量执行测试用例
```bash
mocha --timeout=80000 tbi.test/*.js
```

6. 单独执行 '16.故障数多于理论值的共识'
```bash
# 首先关闭1号、2号节点
# 然后执行如下命令
mocha --timeout=80000 tbi.test/16.*
# 观测到当前测试自动结束后，重启1号、2号节点
```

7. 单独执行 '20.智能合约运行机制的前向兼容'
```bash
# 确保1号、2号节点正常运作
# 确保2号节点版本号为 2.7.0(1.0.0), 可通过 'vc sys.info --http-remote-host=58.220.61.36' 指令查看
# 执行如下命令
mocha --timeout=80000 tbi.test/20.*
# 关闭2号节点，将其从 2.7.0(1.0.0) 升级为 2.7.1(1.0.1), 升级完成后重启
# 观测到当前测试自动结束
```

8. 单独执行 '26.升级节点的稳定性'
```bash
# 确保1号、3号节点正常运作
# 确保3号节点版本号为 2.7.0(1.0.0), 可通过 'vc sys.info --http-remote-host=58.220.61.37' 指令查看
# 执行如下命令
mocha --timeout=80000 tbi.test/26.*
# 关闭3号节点，将其从 2.7.0(1.0.0) 升级为 2.7.1(1.0.1), 升级完成后重启
# 观测到当前测试自动结束
```

## 常用指令

1. sys.info, 用于查看当前系统的版本号，例如查看3号节点版本号

```bash
# 从应答中可以查看到 result.version 
vc sys.info --http-remote-host=58.220.61.37
```

2. 更替系统引擎版本

- 卸载引擎
```bash
npm un gamegold
```

- 安装引擎特定版本
```bash
npm i gamegold@2.7.0
npm i gamegold@2.7.1
```
