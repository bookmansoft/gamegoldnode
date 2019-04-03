# 通过标准 Restful 模式访问全节点

我们以工具软件 Postman 为例，示范如何通过 Restful 执行 RPC 函数

1. token.random

```bash
POST http://localhost:17332

Headers:
    # 由如下参数通过Base64转换而成，可直接在 Postman 中设置，软件会自动转换成 Authorization 参数：
    #   "Username": "bitcoinrpc"
    #   "Password": "bookmansoft"
    Authorization: Basic Yml0Y29pbnJwYzpib29rbWFuc29mdA==
    Content-Type: application/json

Body: 
    raw
    {
	    "method": "token.random",
	    "params": ["xxxxxxxx-game-gold-root-xxxxxxxxxxxx"]
    }
```

```json
{
  "code": 0,
  "error": null,
  "result": "304402207c02b03ae87794ba621d2236735ee044a7e4113fa38cf389438d2730985e5c2e022070fac2c23df2494e45e08a57fdff527d751eb169476d754f2a3982e3854aa00b"
}
```

注：可以使用如下代码生成 Authorization 字段：
```js
const auth = `${this.auth.username}:${this.auth.password}`;
const data = Buffer.from(auth, 'utf8');
headers['Authorization'] = `Basic ${data.toString('base64')}`;
```

2. 执行如下行命令, 参数分别为 cid token random, 其中 random 是 token.random 返回的结果，获得后面步骤需要用到的令牌

```bash
gg hmac.calc xxxxxxxx-game-gold-root-xxxxxxxxxxxx 03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08 304402207c02b03ae87794ba621d2236735ee044a7e4113fa38cf389438d2730985e5c2e022070fac2c23df2494e45e08a57fdff527d751eb169476d754f2a3982e3854aa00b
```

```json
{ 
    "cid"   : "xxxxxxxx-game-gold-root-xxxxxxxxxxxx",
    "token" : "03aee0ed00c6ad4819641c7201f4f44289564ac4e816918828703eecf49e382d08",
    "random": "304402207c02b03ae87794ba621d2236735ee044a7e4113fa38cf389438d2730985e5c2e022070fac2c23df2494e45e08a57fdff527d751eb169476d754f2a3982e3854aa00b",
    "calc"  : "7c20b94943c9d554c165f91f2c582461520319293c02b4274b545bca2d93d923" 
}
```

3. prop.query

```bash
POST http://localhost:17332

Headers:
    Authorization: Basic Yml0Y29pbnJwYzpib29rbWFuc29mdA==
    Content-Type: application/json

Body: 
    raw
    {
        "method":"prop.query", 
        "wid": "primary",
        # 注意这里的 cid 是第2步计算中使用过的参数 cid
        "cid": "xxxxxxxx-game-gold-root-xxxxxxxxxxxx",
        # 注意这里的 token 是第2步计算出来的 calc 字段
        "token": "7c20b94943c9d554c165f91f2c582461520319293c02b4274b545bca2d93d923",
        "params":[]
    }
```
