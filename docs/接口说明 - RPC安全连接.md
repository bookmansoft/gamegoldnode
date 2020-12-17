# RPC安全连接

## 基本概念

1. 基础校验

RPC POST调用中，必须在 Post Headers 中填写[Authorization]字段, 它由如下参数通过Base64转换而成：
- "Username": "bitcoinrpc"
- "Password": "bookmansoft"

可以在 Postman 中设置Authorization相关参数，软件会自动处理包含对应Headers字段值

也可由如下代码生成:
```js
let username = 'bitcoinrpc', password = 'bookmansoft';
const auth = `${username}:${password}`;
const data = Buffer.from(auth, 'utf8');
headers['Authorization'] = `Basic ${data.toString('base64')}`;
```

2. HMAC

RPC POST采用HMAC算法避免中间人攻击(MITM), dev-mode下可忽略此项设置:
- 全节点为终端制作证书并离线分发给终端，证书含[终端号]+[令牌尾]。注意证书信息不能泄露给第三方
- 终端向全节点发起在线请求并上传[终端号]，全节点生成随机[令牌头]下发给终端。注意[令牌头]有时效性
- 终端利用[令牌头]和[令牌尾]本地合成[令牌]，在后续的RPC请求中始终附加[终端号]+[令牌]
- 在[令牌头]失效前，终端负责申请新的[令牌头]并刷新令牌，目前设定以本机时间的小时的整数值作为锚定值

3. 数据报文签名校验

RPC POST的上下行报文都采用签名验证模式, dev-mode下可忽略此项设置:
- 发送方对上行报文所有字段按字母正序排序后抽取成KV字符串
- 发送方使用椭圆曲线算法secp256k1，用[令牌尾]作为密钥，计算KV字符串的签名字段(sig字段)，随上行报文一并发送
- 接收方使用同样方式演算签名字段后进行数值比对校验

## 连接步骤详述

**注意** 可以使用[Postman]工具软件执行相关测试，以系统自带的行命令工具作为辅助工具

1. 系统管理员通过行命令为终端生成证书

**系统管理员要确保节点运行时携带 --dev-mode=false 命令行参数，也可以停止当前节点运行，修改配置文件 gamegold.conf, 将 dev-mode 设置为 false，然后重启系统**

```bash
# 利用系统行命令工具，以终端号(cid)为输入参数执行命令，系统管理员使用的终端号为[xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx]
vc createAuthToken xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx
```

[Response]
```bash
026190ea1cca7ee8c260c3c7da9501982928860138827d499c985586cfa13c1b03
```

系统管理员将生成的证书内容(终端号和和令牌尾)，离线方式发放给终端管理员

2. 终端向全节点申请[令牌头]，注意该上行只需要填写method和params字段

[Request]
```bash
POST http://localhost:2102

Headers:
    Authorization: Basic Yml0Y29pbnJwYzpib29rbWFuc29mdA==
    Content-Type: application/json

Body: 
    raw
    {
	    "method": "token.random",
	    "params": ["xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx"]
    }
```

[Response]
```json
{
  "code": 0,
  "error": null,
  "result": "3044022055e091d601cc835efaeee330298487f8cf73564a7fc10373b78e92fd54ef4e5902203cc9f34a806fa9674ba58b6220a713c1787e5a99170d0378212b58f5e6f2432e"
}
```
**result为返回的[令牌头]字段，注意该调用的返回形式不是JSON模式**

3. 终端利用[令牌头]和[令牌尾]本地合成[令牌]，注意定期刷新[令牌头]后都需要重新计算[令牌]

如下为计算最终令牌的js代码示例:

```js
const crypto = require('crypto'); //加密依赖库
// 终端获颁证书中的[令牌尾]
let token = '026190ea1cca7ee8c260c3c7da9501982928860138827d499c985586cfa13c1b03';
// token.random 的返回结果，即[令牌头]
let random = '3044022055e091d601cc835efaeee330298487f8cf73564a7fc10373b78e92fd54ef4e5902203cc9f34a806fa9674ba58b6220a713c1787e5a99170d0378212b58f5e6f2432e';
// 计算最终的令牌(HEX字符串形式)，crypto.createHmac为标准HMAC算法
let calc = crypto.createHmac('sha256', random).update(token).digest().toString('hex');
```

可以使用系统行命令工具，进行模拟计算:
```bash
# hmac.calc cid token random
vc hmac.calc xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx 026190ea1cca7ee8c260c3c7da9501982928860138827d499c985586cfa13c1b03 3044022055e091d601cc835efaeee330298487f8cf73564a7fc10373b78e92fd54ef4e5902203cc9f34a806fa9674ba58b6220a713c1787e5a99170d0378212b58f5e6f2432e
```

```json
{ 
    "cid"   : "xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx",
    "token" : "026190ea1cca7ee8c260c3c7da9501982928860138827d499c985586cfa13c1b03",
    "random": "3044022055e091d601cc835efaeee330298487f8cf73564a7fc10373b78e92fd54ef4e5902203cc9f34a806fa9674ba58b6220a713c1787e5a99170d0378212b58f5e6f2432e",
    "calc"  : "89613217e44583dca4ea0a7b15a6c1a871e7ede91fdbf19626083d126be929a9" 
}
```
**返回结果中的calc为最终的访问令牌**

4. 设定上行报文，计算签名字段

```js
//获取[令牌尾]
let token = "026190ea1cca7ee8c260c3c7da9501982928860138827d499c985586cfa13c1b03";

//设定发送报文，报文有且只有如下4个字段
let packet = {
    method: "block.tips",                           //命令字
    params: [],                                     //命令参数数组，本示例设为空数组
    cid: "xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx",    //终端号
    wid: "primary",                                 //钱包名称，默认都为"primary"
};

//计算报文签名，注意是使用[令牌尾]进行签名. [hash256]是指连续进行两次[sha256]运算
let sig = signObj(packet, hash256(Buffer.from(token)));

/**
 * 用指定密钥，对指定报文生成并返回签名字段
 * @param {Object}      packet      待签名的报文对象
 * @param {Buffer}      pri         签名私钥，Buffer格式
 * @returns {String}                报文签名的字符串形式
 */

function signObj(packet, pri) {
    //secp256k1为选择secp256k1曲线的标准椭圆曲线签名算法
    return secp256k1.sign(hash256(Buffer.from(stringify(msg))), pri).toString('hex');
};

/**
 * 序列化对象，和 JSON.stringify 不同之处在于，排除了属性排序变化带来的影响，并且不考虑反序列化的需要
 * @param {Object} data      待序列化的对象
 */

function stringify(data) {
    if(Array.isArray(data)) { //考虑数组的情形
        return data.reduce((sofar,cur)=>{
            sofar += stringify(cur);
            return sofar;
        }, '');
    }

    let base = '';
    //将对象所有属性，按照属性名称字母升序模式排序
    Object.keys(data).sort().map(key=>{
        if(!!data[key]) { //排除空字段
            base += key + stringify(data[key]); //考虑属性嵌套对象的情形
        }     
    });

    //返回紧凑型排序序列化字符串
    return base;
}
```

可以使用系统行命令工具，进行模拟计算，注意此处双引号和单引号的用法:

```bash
# signObj packet token
vc signObj "{'method':'block.tips','wid':'primary','cid':'xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx','params':[]}" 026190ea1cca7ee8c260c3c7da9501982928860138827d499c985586cfa13c1b03
```

Response:
```json
{
  "msg": {
    "method": "block.tips",
    "wid": "primary",
    "cid": "xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx",
    "params": []
  },
  "sig": "3045022100b9c6525009697265bab2ce8174b5b37c88b301ed0f801d683fb5c29f880df8370220224dd6b1b59faaf449c3d8c82c40a5d229868eedaf25f3d41708c30d7e13de5b",
  "pub": "030a207f0751c42f515f7054591f7ca3710d667362556ad0c7d9c198f99c1a50ea"
}
```
**上述返回结果中，sig是上传报文时实际使用的签名字段. pub是签名密钥中的公钥，上传时没有实际使用**

5. 终端向全节点申请执行远程命令

```bash
POST http://localhost:2102

Headers:
    Authorization: Basic Yml0Y29pbnJwYzpib29rbWFuc29mdA==
    Content-Type: application/json

Body: 
    raw
    {
        # 命令字 - 查询当前链库概要信息
        "method":"block.tips",
        # 钱包编号 
        "wid": "primary",
        # 终端号
        "cid": "xxxxxxxx-vallnet-root-xxxxxxxxxxxxxx",
        # 访问令牌(dev-mode模式下可置空)，就是第3步计算得到的calc字段
        "token": "89613217e44583dca4ea0a7b15a6c1a871e7ede91fdbf19626083d126be929a9",
        # 命令参数数组
        "params":[],
        # 上行报文签名(dev-mode模式下可置空)
        "sig":"3045022100b9c6525009697265bab2ce8174b5b37c88b301ed0f801d683fb5c29f880df8370220224dd6b1b59faaf449c3d8c82c40a5d229868eedaf25f3d41708c30d7e13de5b"
    }
```

6. 错误处理

如果调用返回如下错误，很可能是 random 过时，此时需要重新从步骤[2]开始执行

```json
{
    "type": "HmacError",
    "message": "Hmac Auth failure."            
}
```

**终端应该设置每半小时自动调用 token.random 刷新令牌头，用[令牌尾]和最新[令牌头]重新计算[令牌]**
