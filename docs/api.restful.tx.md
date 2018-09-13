### 和交易相关的接口

#### 根据交易ID获取交易信息
1、定义
```js
  app.get('/tx/:txid', transactions.show.bind(transactions));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/#/api/tx/a0aa92665cd61c5c2b2fe6f26287a226fb6fea033c59881298de36775773ce70
```

3、返回值
```json
{
    "txid":"a0aa92665cd61c5c2b2fe6f26287a226fb6fea033c59881298de36775773ce70",
    "version":1,
    "locktime":0,
    "isCoinBase":true,
    "vin":[     
        {
            "coinbase":"03785708202f5669614254432f4d696e656420627920677a7867666a7a687339313330302f2cfabe6d6dcdfdf8fed333ae7546bc9a3ee4ede9d1bf98e4ef3efd7cae20d6adb23b77ac57040000000000000010d7f0b90bf326c24d7fcbc32d79300100",
            "sequence":4294967295,
            "n":0
        }
    ],
    "vout":[
        {
            "value":"12.58185276",
            "n":0,
            "scriptPubKey":{
                "hex":"76a914f1c075a01882ae0972f95d3a4177c86c852b7d9188ac",
                "asm":"OP_DUP OP_HASH160 f1c075a01882ae0972f95d3a4177c86c852b7d91 OP_EQUALVERIFY OP_CHECKSIG",
                "addresses":["qrcuqadqrzp2uztjl9wn5sthepkg22majyxw4gmv6p"],
                "type":"pubkeyhash"
            },
            "spentTxId":null,
            "spentIndex":null,
            "spentHeight":null
        }
    ],
    "blockhash":"00000000000000000076b2016cde9097d68424e238c8a60a4de552895eb1cc32",
    "blockheight":546680,
    "confirmations":1,
    "time":1536227565,
    "blocktime":1536227565,
    "valueOut":12.58185276,
    "size":184
}
```

#### 根据交易ID，查询交易原始数据
1、定义
```js
  app.get('/rawtx/:txid', transactions.showRaw.bind(transactions));
```

2、调用范例
```bash
  curl https://bch-insight.bitpay.com/api/rawtx/9c22557a6c36127daea66dd80657ca6c65a67fe665f23f980b4df3c365d7cdc5
```

3、返回值
```json
{
  "rawtx":"01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff2403c85008174d696e656420627920416e74506f6f6c3426205b816995350600008e0b0100ffffffff02b957824a000000001976a9141fefe863a7e0ddc767780ce3bedc564cf5cbda6388ace51d0000000000001976a914000000000000000000000000000000000000000088ac00000000"
}
```

#### 查询区块或地址相关交易列表，支持分页

1、定义
```js
    // 入口参数
    // req.query.block;
    // req.query.address;
    // req.query.pageNum;
    app.get('/txs', transactions.list.bind(transactions));
```

2、调用范例
```bash
  curl https://insight.bitpay.com/api/txs?block=000000000000000000020ce5c7fb6f916e94cc8c4dcb8612eeb2fff52495ecfe&pageNum=2
```
```bash
  curl https://insight.bitpay.com/api/txs?address=qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac
```

3、返回值
```json
{
  "pagesTotal":221,
  "txs":[
    {
      "txid":"44f814cb17bce592fffbfbc86f187c0ba67c71c37240444133ae5beda8a22a6f",
      "version":1,
      "locktime":0,
      "vin":[
        {
          "txid":"4e857cc14a3848bf424c3d3f82d75a16d7c3f3011f699f9393b5cf3e1890e668",
          "vout":10,
          "sequence":4294967295,
          "n":0,
          "scriptSig":{
            "hex":"483045022100d5d8ce5aa87d8686b4eb57c6fe97bf9fa9eade0885acd75abadac55caf7cc7fe022079eff5b52ea4ed5ff56a86b3fe8f6510d8457b202ee2c3fefc196bc8aa69ce7a0121038482c9aef4e72ee8ef2501dddf27bbca7f5711400c7a9d4adb6dba82746fd0eb",
            "asm":"3045022100d5d8ce5aa87d8686b4eb57c6fe97bf9fa9eade0885acd75abadac55caf7cc7fe022079eff5b52ea4ed5ff56a86b3fe8f6510d8457b202ee2c3fefc196bc8aa69ce7a[ALL] 038482c9aef4e72ee8ef2501dddf27bbca7f5711400c7a9d4adb6dba82746fd0eb"
          },
          "addr":"1Nde8sQVbD3MJXxSohQJvRWKZKx9Zfo4oZ",
          "valueSat":9263816813,
          "value":92.63816813,
          "doubleSpentTxID":null
        }
      ],
      "vout":[
        {
          "value":"0.00527203",
          "n":0,
          "scriptPubKey":{
            "hex":"a914b71350787646b97f2508010dd51dea5d6079773887",
            "asm":"OP_HASH160 b71350787646b97f2508010dd51dea5d60797738 OP_EQUAL",
            "addresses":["3JP2iddqvycmRyZi944oVtN9eiSP57Tmwj"],
            "type":"scripthash"
          },
          "spentTxId":null,
          "spentIndex":null,
          "spentHeight":null
        }
      ],
      "blockhash":"000000000000000000020ce5c7fb6f916e94cc8c4dcb8612eeb2fff52495ecfe",
      "blockheight":540209,
      "confirmations":1,
      "time":1536242593,
      "blocktime":1536242593,
      "valueOut":92.63780119,
      "size":648,
      "valueIn":92.63816813,
      "fees":0.00036694
    }
  ]
}
```

```json
{
  "pagesTotal":1,
  "txs":[
    {
      "txid":"7f812fa570950279c0c366b25ff30a3b8fdc7f130516ca8d76794c0a4954a399",
      "version":1,
      "locktime":0,
      "vin":[
        {
          "txid":"ad0ccb3718201d7392b4d49ef0df56557dad8cee4d5ab9b9605b34fa5fc05a2c",
          "vout":0,
          "sequence":4294967295,
          "n":0,
          "scriptSig":{
            "hex":"483045022100c7b2408fd0dcffbcdd00feffad4daba55c0fc908a2ae5b1941db82904fd028e0022072a568f9d2190541c6431d92e2b1e722af1db6501cacf3e7941a99c29e4b0dff41210381c5d018624c510d551646e605596e425c80cfa1c154dad7099501ce566179f8",
            "asm":"3045022100c7b2408fd0dcffbcdd00feffad4daba55c0fc908a2ae5b1941db82904fd028e0022072a568f9d2190541c6431d92e2b1e722af1db6501cacf3e7941a99c29e4b0dff41 0381c5d018624c510d551646e605596e425c80cfa1c154dad7099501ce566179f8"
          },
          "addr":"qzj93tjl4unastps6c4rmg0xd6tgfxmmsu83r39jac",
          "valueSat":1000000000,
          "value":10,
          "doubleSpentTxID":null,
          "isConfirmed":null,
          "confirmations":null,
          "unconfirmedInput":null
        }
      ],
      "valueIn":10,
      "fees":0.00000382,
      "vout":[
        {
          "value":"1.63873531",
          "n":0,
          "scriptPubKey":{
            "hex":"76a9149cb2f21046880cadffa76f13080194f6dd70a74488ac",
            "asm":"OP_DUP OP_HASH160 9cb2f21046880cadffa76f13080194f6dd70a744 OP_EQUALVERIFY OP_CHECKSIG",
            "addresses":["qzwt9ussg6yqet0l5ah3xzqpjnmd6u98gsr6n83pqm"],
            "type":"pubkeyhash"
          },
          "spentTxId":null,
          "spentIndex":null,
          "spentHeight":null
        },
        {
          "value":"8.36126087",
          "n":1,
          "scriptPubKey":{
            "hex":"76a914a772af263fda5e95d6fc6461e6868d8aeb21499e88ac",
            "asm":"OP_DUP OP_HASH160 a772af263fda5e95d6fc6461e6868d8aeb21499e OP_EQUALVERIFY OP_CHECKSIG",
            "addresses":["qznh9tex8ld9a9wkl3jxre5x3k9wkg2fncgchnmza5"],
            "type":"pubkeyhash"
          },
          "spentTxId":null,
          "spentIndex":null,
          "spentHeight":null
        }
      ],
      "blockhash":"000000000000000001c807fe20a65c06afd7a26a57e3d909988709f357b841d7",
      "blockheight":544985,
      "confirmations":1704,
      "time":1535214645,
      "blocktime":1535214645,
      "valueOut":9.99999618,
      "size":226
    }
  ]
}
```
