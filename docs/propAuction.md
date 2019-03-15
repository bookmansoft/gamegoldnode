# 道具拍卖交易流程

## API设计

1. prop.remoteQuery     从全节点中查询道具列表，可用于查询全局拍卖列表: 查询指定生产者名下、正在拍卖市场上流通的所有道具， cid 指定生产者， page 指定分页的页码， pid 指定特定的待查寻的道具ID

```bash
prop.remoteQuery "[['cid',''],['page',1]]"
```

2. prop.query           条件查询本地道具

3. prop.sale            拍卖自己的道具，道具拥有者可以通过该指令对其发起拍卖操作

```bash
prop.sale pid fixedPrice
```

@note 拍卖交易是一笔不完整的、有时效性的交易，可以中继但无法上链
@note 超过时效但无人竞拍的拍卖交易会流拍，所有节点将从内存池中定期清除流拍的拍卖交易
@note 指定将要拍卖的道具所在的交易的哈希，并给出拍卖一口价，将生成一个拍卖交易
@note 进入拍卖序列的道具，会拥有独特的状态标识，在消除该状态前，不可执行转移、熔铸等业务操作

4. prop.buy             从拍卖市场竞拍道具

```bash
prop.buy pid bidPrice
```

@note 竞拍交易是原拍卖/竞拍交易的取代者而非消费者，一旦竞拍交易生成，原拍卖/竞拍交易将立即作废
@note 一个出价更高的竞拍交易，将立即取代针对同一个拍卖交易的、历史上出价最高的竞拍交易，除非前者已经达到一口价，或者竞价窗口期结束
@note 如果拍卖交易到点，或者竞拍金额达到一口价则立刻成交，节点开始广播最终的成交交易
@note 最终成交交易就是竞价窗口期内产生的、针对原始拍卖交易、历史上出价最高的竞拍交易，它可以中继，也可以上链
@note
    指定要参与竞拍的道具的 pid ，以及自己的出价，就可以参与竞拍
    如果出价高于该拍卖交易的初始价格（自身含金量）以及所有历史报价，那么将形成一个新的拍卖交易，替代之前的拍卖交易
    如果出价高于该拍卖交易的一口价，那么将形成一个新的、已锁定的拍卖交易，替代之前的拍卖交易
    拍卖交易的有效期截止，或者提前进入锁定状态，就会被打包到区块中，打包结束后道具发生了转移，并进入买家钱包的道具列表中，而卖家将得到一笔拍卖金，反映为零钱增加
    如果流拍，交易取消，道具回到原主人手中

5. prop.list.auction    列表自己正在拍卖的道具，可以视为 prop.query 的快捷方式。参拍行为不可撤销，只能等待交易超时自动撤销

6. prop.list.bid        列表自己参与拍卖的道具，可以视为 prop.query 的快捷方式

## 单元测试设计

### 最新模拟流程
1. 完成初始准备工作

```bash
miner.setsync

miner.generate 100

cp.create bookman http://127.0.0.1

miner.generate 1
```

2. 生成两个独立子账户，记录他们的有效地址

```bash
token.user cid u1 null u1

token.user cid u2 null u2
```

3. 系统生成道具并发送给 u1

```bash
# 创建一个道具
prop.create cid p1 10000

# 查看新生成的道具
prop.query "[['oid','p1']]"

# 系统将道具发送给 u1
prop.send u1Addr pid
miner.generate 1

# u1 列表刚刚得到的道具
prop.list 1 u1

# 如下指令可以起到类似的效果
prop.query "[['page',1]]" u1
prop.query null u1
```

4. u1 发起道具拍卖

```bash
prop.sale pid 20000 u1
```

5. u2 发起道具竞拍

```bash
# 为 u2 转账以足够支付竞拍金额
tx.send u2Address

prop.buy pid 20000 u2

prop.query null u2
```

### 模拟流程一
1、A用户选取自己的物品发起一笔拍卖交易，钱包会立即将该交易广播到P2P网络上，也会在本地通过事件进行通告（以防P2P网络没有回传）
2、A用户可以本地钱包上通过 prop.list.auction 指令查看到该笔交易
3、拍卖交易将通过P2P网络持续进行传播，每到达一个节点，将引发如下共识检测：
    1、该笔交易是否还在有效期内，如果不在将立即丢弃
    2、查询当前节点对同一件物品的竞拍记录：
        1、如果先前没有记录，就将该笔交易登记于拍卖列表中，并继续广播该交易。如果该交易达到了一口价，就在拍卖列表中标记竞拍结束
        2、如果有，但竞拍已结束，就丢弃该笔交易
        3、如果有，且竞拍未结束，则比对该笔交易和已有交易的出价，高出则替换已有交易，并继续广播，否则丢弃该笔交易
    3、如果因为重整等原因，导致交易被主动抛弃，则从竞拍列表中移除该笔交易
    4、如果达到成交条件，则更改物品的归属。注意此时交易并未上链，但在零确认机制达成了物品转移的效果
    @note 上述流程在 mempool 上执行，和链库上的结果互不影响
4、矿工打包时，在链上引发如下共识检测：
    1、判断该笔交易是否已经成交，如果已经成交，则将这笔成交的交易打包到链上。如果失效则从内存中移除，否则继续放置不理
    2、交易上链后，将从竞拍列表中移除该笔交易，同时物品的归属发生了转移。注意该结果和池库上的结果互不影响

### 模拟流程二
1、A用户通过全节点钱包，选取自己的物品发起一笔竞拍交易。这笔交易将被广播并记录到全节点的拍卖列表中
2、B用户通过SPV节点进行全局搜索，获取了上述拍卖消息，随即发起了一笔竞拍交易(小于一口价)，同时向布隆过滤器中添加观测内容。该竞拍交易可以通过 prop.list.bid 查询
3、B用户向该物品发起一次新的竞拍，达到了一口价的要求
4、B用户立刻收到了这次新的竞拍内容，同时刷新了 prop.list.bid 中的记录。
5、因为一口价被满足，本次竞拍结束，等待打包上链
6、新的区块到达，交易信息被刷新，物品被转移

### 模拟流程三
1、我的道具，我发起了一笔拍卖，此时我的道具列表中失去了这个道具，但可以通过 prop.list.auction 查询该交易
2、我参与了竞拍，此时可以通过 prop.list.bid 查询该交易
3、他人以更高价格参与了竞拍，此时我收到了一笔竞拍交易，将与我本地发起的竞拍交易构成双花
4、我的钱包比对后将删除我原先的竞拍，以新的竞拍替代
5、矿工打包，此时我收到了确认消息，我彻底失去了这个道具

### 道具的发行和空投
1、远端全节点注册一个生产者
2、远端全节点以该生产者的名义，生成一个道具并转移给本地节点钱包中的地址，然后打包上链
3、本地节点查询道具列表时，会立刻感知到新的道具，同时会自动将相关的生产者信息同步到本地，并在道具详情中显示出来

### 监控自身道具的拍卖流程
1、远端全节点向本地钱包地址转入一个道具，然后打包上链
2、本地节点挂单拍出该件道具
3、远端全节点参与竞拍
4、本地节点立刻感知到新的竞拍行为

### 监控第三方道具的拍卖过程
1、本地SPV节点创建一个监控队列
2、本地SPV节点将感兴趣的道具的地址加入监控队列
3、远端全节点拍卖该道具
4、本地SPV节点立刻感知到新的竞拍行为