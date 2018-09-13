### 和地址相关的接口

#### 根据地址字符串，获取相应地址的关联信息
1、定义
```js
  app.get('/addr/:addr', addresses.checkAddrs.bind(addresses), addresses.show.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addr/qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac
```

3、返回值
```json
{
    "addrStr": "qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac",
    "balance": 10,
    "balanceSat": 1000000000,
    "totalReceived": 21.738,
    "totalReceivedSat": 2173800000,
    "totalSent": 11.738,
    "totalSentSat": 1173800000,
    "unconfirmedBalance": 0,
    "unconfirmedBalanceSat": 0,
    "unconfirmedTxApperances": 0,
    "txApperances": 2,
    "transactions": [
      "f0a56e7eedb628e8ff5bd9399aa0f4a1cc909168bb66129e170708ca8ff7911f", 
      "b1f14329a2ce13415f2c083aadb75e78cc01315a68a8448ecadc24794b8309fd", 
      "ad0ccb3718201d7392b4d49ef0df56557dad8cee4d5ab9b9605b34fa5fc05a2c"
    ]
}
```

#### 根据地址字符串，获取相应地址的UTXO集合
1、定义
```js
  app.get('/addr/:addr/utxo', addresses.checkAddrs.bind(addresses), addresses.utxo.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addr/qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac/utxo
```

3、返回值
```json
[
  {
    "address": "qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac",
    "txid": "ad0ccb3718201d7392b4d49ef0df56557dad8cee4d5ab9b9605b34fa5fc05a2c",
    "vout": 0,
    "scriptPubKey": "76a914a458ae5faf27d82c30d62a3da1e66e96849b7b8788ac",
    "amount": 10,
    "satoshis": 1000000000,
    "height": 544967,
    "confirmations": 13
  }
]
```

#### 查询多个地址的UTXO合集
1、定义
```js
  app.get('/addrs/:addrs/utxo', addresses.checkAddrs.bind(addresses), addresses.multiutxo.bind(addresses));
```
```js
  app.post('/addrs/utxo', addresses.checkAddrs.bind(addresses), addresses.multiutxo.bind(addresses));
```

2、调用范例, 地址字符串采用逗分格式，最多4个
```bash
  curl https://bch-insight.bitpay.com/api/addrs/qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac,qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf/utxo
```

```bash
  # PowerShell curl
  curl -Method Post -Body "addrs=qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac,qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf" https://bch-insight.bitpay.com/api/addrs/utxo

  # curl 
  curl -X POST --data "addrs=qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac,qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf" https://bch-insight.bitpay.com/api/addrs/utxo
```

3、返回值
```json
[
  {
    "address": "qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac",
    "txid": "ad0ccb3718201d7392b4d49ef0df56557dad8cee4d5ab9b9605b34fa5fc05a2c",
    "vout": 0,
    "scriptPubKey": "76a914a458ae5faf27d82c30d62a3da1e66e96849b7b8788ac",
    "amount": 10,
    "satoshis": 1000000000,
    "height": 544967,
    "confirmations": 14
  }, 
  {
    "address": "qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf",
    "txid": "b1f14329a2ce13415f2c083aadb75e78cc01315a68a8448ecadc24794b8309fd",
    "vout": 1,
    "scriptPubKey": "76a9140d55e0eaea8190a6c9dc129288b90397dc62d9e388ac",
    "amount": 0.00058477,
    "satoshis": 58477,
    "height": 544968,
    "confirmations": 13
  }, 
  {
    "address": "qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf",
    "txid": "b6515df332afe96975b910474101bcad9f3704e36a025cb3298a09d7df1ed174",
    "vout": 1,
    "scriptPubKey": "76a9140d55e0eaea8190a6c9dc129288b90397dc62d9e388ac",
    "amount": 10.03049683,
    "satoshis": 1003049683,
    "height": 491481,
    "confirmations": 53500
  }
]
```

#### 多地址交易查询
1、定义
```js
  app.get('/addrs/:addrs/txs', addresses.checkAddrs.bind(addresses), addresses.multitxs.bind(addresses));
  app.post('/addrs/txs', addresses.checkAddrs.bind(addresses), addresses.multitxs.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addrs/qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac,qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf/txs
  curl -X POST --data "addrs=qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac,qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf" https://bch-insight.bitpay.com/api/addrs/txs
```

3、返回值
```json
{
    "totalItems": 6,
    "from": 0,
    "to": 6,
    "items": [{
        "txid": "4da4f78590c1b648e127c30bdf10318e8fab4fc3d735815e71b69f5fec4e021d",
        "version": 1,
        "locktime": 0,
        "vin": [{
            "txid": "efd702c094ad62f2e42a10eaa909428ec956c1d737e561ef25bbc2f523a5be7e",
            "vout": 1,
            "sequence": 4294967295,
            "n": 0,
            "scriptSig": {
                "hex": "4830450220369720a96415c40111082c9d3a2034cb09efb28843ef7ad44a9038047e0da8b7022100f5b6087747de69053490bc01fb38bd3651584b0bd322b7228793cd4d25a9d6e4014104a8f73f8cfc61dd803b472e41df3c3de487b165ac7bc13f5b9f562a5fe0aef7675b08447c7826fff031df22302095ce5084a9daec16fdc82aba3a1cbedbfde670",
                "asm": "30450220369720a96415c40111082c9d3a2034cb09efb28843ef7ad44a9038047e0da8b7022100f5b6087747de69053490bc01fb38bd3651584b0bd322b7228793cd4d25a9d6e401 04a8f73f8cfc61dd803b472e41df3c3de487b165ac7bc13f5b9f562a5fe0aef7675b08447c7826fff031df22302095ce5084a9daec16fdc82aba3a1cbedbfde670"
            },
            "addr": "qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf",
            "valueSat": 1000000000,
            "value": 10,
            "doubleSpentTxID": null,
            "isConfirmed": null,
            "confirmations": null,
            "unconfirmedInput": null
        }],
        "valueIn": 10,
        "fees": 0.0001,
        "vout": [{
            "value": "0.50000000",
            "n": 0,
            "scriptPubKey": {
                "hex": "76a914aa064dd44a83a6592704b3e4df54be7fd5ac5a2488ac",
                "asm": "OP_DUP OP_HASH160 aa064dd44a83a6592704b3e4df54be7fd5ac5a24 OP_EQUALVERIFY OP_CHECKSIG",
                "addresses": ["qz4qvnw5f2p6vkf8qje7fh65helattz6ys2nazryw5"],
                "type": "pubkeyhash"
            },
            "spentTxId": null,
            "spentIndex": null,
            "spentHeight": null
        }, {
            "value": "9.49990000",
            "n": 1,
            "scriptPubKey": {
                "hex": "76a9140d55e0eaea8190a6c9dc129288b90397dc62d9e388ac",
                "asm": "OP_DUP OP_HASH160 0d55e0eaea8190a6c9dc129288b90397dc62d9e3 OP_EQUALVERIFY OP_CHECKSIG",
                "addresses": ["qqx4tc82a2qepfkfmsff9z9eqwtacckeuvre8x5dkf"],
                "type": "pubkeyhash"
            },
            "spentTxId": null,
            "spentIndex": null,
            "spentHeight": null
        }],
        "blockhash": "00000000000000010cc748cb7c481b2d4e2c1c142c6295b21c148fb3c0e62771",
        "blockheight": 290250,
        "confirmations": 254731,
        "time": 1394652831,
        "blocktime": 1394652831,
        "valueOut": 9.9999,
        "size": 258
    }]
}
```

### 地址关联属性接口

#### 地址余额
1、定义
```js
  app.get('/addr/:addr/balance', addresses.checkAddrs.bind(addresses), addresses.balance.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addr/qpv6xw73prvm7pqavjkdnc8ddfw20j9995v8ardefh/balance
```

3、返回值
```json
  1.99900114
```

#### 地址总接收
1、定义
```js
  app.get('/addr/:addr/totalReceived', addresses.checkAddrs.bind(addresses), addresses.totalReceived.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addr/qpv6xw73prvm7pqavjkdnc8ddfw20j9995v8ardefh/totalReceived
```

3、返回值
```json
  1.99900114
```

#### 地址总花费
1、定义
```js
  app.get('/addr/:addr/totalSent', addresses.checkAddrs.bind(addresses), addresses.totalSent.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addr/qpv6xw73prvm7pqavjkdnc8ddfw20j9995v8ardefh/totalSent
```

3、返回值
```json
  0
```

#### 地址未确认金额
1、定义
```js
  app.get('/addr/:addr/unconfirmedBalance', addresses.checkAddrs.bind(addresses), addresses.unconfirmedBalance.bind(addresses));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/addr/qpv6xw73prvm7pqavjkdnc8ddfw20j9995v8ardefh/unconfirmedBalance
```

3、返回值
```json
  0
```
