### 系统状态查询类接口

#### 系统状态
1、定义
```js
  app.get('/status', status.show.bind(status));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/status
```

3、返回值
```json
{
    "info": {
        "version": "bitcore-1.1.2",
        "blocks": 544981,
        "proxy": "",
        "difficulty": 559149630057,
        "testnet": false,
        "relayfee": 0,
        "errors": "",
        "network": "livenet"
    }
}
```

#### 同步状态
1、定义
```js
  app.get('/sync', this.cacheShort(), status.sync.bind(status)); 
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/sync
```

3、返回值
```json
{
    "status": "finished",
    "blockChainHeight": 544981,
    "syncPercentage": 100,
    "height": 544981,
    "error": null,
    "type": "bitcore node"
}
```

#### API版本信息
1、定义
```js
  app.get('/version', status.version.bind(status));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/version
```

3、返回值
```json
{
    "version":"5.0.0-beta.44"
}
```

#### 连接节点信息
1、定义
```js
  app.get('/peer', status.peer.bind(status));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/peer
```

3、返回值
```json
{
    "connected": true,
    "host": "127.0.0.1",
    "port": null
}
```

#### 手续费估算
1、定义
```js
  app.get('/utils/estimatefee', utils.estimateFee.bind(utils));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/utils/estimatefee
```

3、返回值
```json
{
    "2":0.00001
}
```

#### 汇率
1、定义
```js
  app.get('/currency', currency.index.bind(currency));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/currency
```

3、返回值
```json
{
    "status": 200,
    "data": {
        "kraken": 531.4
    }
}
```

#### 支持币种
1、定义
```js
  app.get('/explorers' , this._getExplorers.bind(this));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/explorers
```

3、返回值
```json
[
  {
    "name": "Bitcoin Cash",
    "ticker": "BCH",
    "url": "https://bch-insight.bitpay.com"
  },
  {
    "name": "Bitcoin",
    "ticker": "BTC",
    "url": "https://insight.bitpay.com"
  }
]
```
