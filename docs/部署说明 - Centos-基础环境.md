# 安装步骤 - 基础

**基础步骤是所有类型节点(盟主、盟友)都必须完成的**

### 部署运行环境

- 在PC服务器(X86 64位 4核8G)上部署[CentOS 7.6]
- 在华为鲲鹏服务器(Kunpeng 920 4核8G)上部署[EulerOS 2.8 64bit with ARM]

在选定软硬件平台上安装Node的指定版本: Nodejs@12.20.0

```bash
$ curl -sL https://rpm.nodesource.com/setup_12.x | bash -
$ sudo yum -y install nodejs
```

也可下载后直接运行,下载链接: https://nodejs.org/dist/v12.20.0/node-v12.20.0-linux-x64.tar.gz
**根据对应的CPU内核选择linux-64或者linux-armv7l版本**
**Nodejs@14.x或更高版本对部分依赖库兼容性不佳，所以请安装指定版本**

在选定软硬件平台上安装代码库管理软件 Git

```bash
$ sudo yum -y install git
```

验证环境与结果

```bash
$ node -v
v12.20.0

$ git --version
git version 2.29.2
```

### 2. 克隆代码库

在运行主机上建立专门的管理目录，并确保运行主机处于联网状态，然后在行命令模式下，进入管理目录，执行如下命令：

```bash
# 克隆项目代码库
$ git clone https://github.com/bookmansoft/gamegoldnode
# 进入项目目录
$ cd gamegoldnode
```

**本软件为数据引擎类软件，仅含服务端软件，不含客户端软件，对外开放远程调用接口(RPC)与第三方软件交互，可根据第三方要求定制开发配套SDK**

命令执行结束后，当前目录为项目根目录 ./gamegoldnode

### 3. 配置依赖项

行命令模式下，确保处于项目根目录下，执行如下命令：

```bash
# 安装依赖项
$ sudo npm i
# 生成快捷指令链接，该指令会在 /usr/bin/ 目录下生成 vc.* 快捷指令，同时在 /usr/lib/node_modules/gamegoldnode 目录下生成项目快照，如有需要，可手工清除上述文件，再重新运行指令
$ sudo npm link
```



### 4. 验证启动(该步骤可略过)

```bash
# 测试启动服务
$ npm run start
```

截图

测试启动,会生成冗余文件,需执行以下命令清理.

```bash
# 删除测试启动生成的冗余文件
$ rm -fr ./testnet-genesis.keystore ./testnet-genesis.params ./gamegold/test
```



### 5. 注册gamegoldnode为系统服务

- 创建gamegoldnode.service文件,内容如下:

```conf
[Unit]
Description=GameGold Node Server

[Service]
ExecStart=[/path/to/npm/executable] run [Nodetype]
Restart=always
User=[yourUserName]
Group=[yourUserGroup]
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
WorkingDirectory=[/path/to/node-gamegoldnode]

[Install]
WantedBy=multi-user.target
```

其中,中括号[]是占位符,需要根据具体安装情况填写

```conf
[/path/to/npm/executable]：npm可执行文件的绝对路径
[/path/to/node-gamegoldnode]：gamegoldnode的绝对路径
[Nodetype]: 节点类型: master/slaver
[yourUserName]：你的用户名
[yourUserGroup]：你的组名
```

下面的命令可以帮你找出来这几个占位符的值

```bash
# node executable path
$ which node

# your user name
$ id -un

# your group name
$ id -gn
```

下面是一个已经改好的例子:

```conf
[Unit]
Description=GameGold Node Server

[Service]
ExecStart=/usr/bin/npm run master
Restart=always
User=gamegold
Group=gamegold
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
WorkingDirectory=/home/gamegold/gamegoldnode

[Install]
WantedBy=multi-user.target
```

- 将配置文件拷贝到 Systemd 之中:

```bash
$ sudo cp gamegoldnode.service /etc/systemd/system
```

- 加载服务

```bash
# 重载配置文件
$ sudo systemctl daemon-reload

```

- P.S. 启动、重启、停止服务以及开机自启命令参考:

```bash

# 启动服务
$ sudo systemctl start gamegoldnode

# 重启服务
$ sudo systemctl restart gamegoldnode

# 停止服务
$ sudo systemctl stop gamegoldnode

# 开机自启
$ sudo systemctl enable gamegoldnode
```



