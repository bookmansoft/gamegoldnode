# 基于CTID的意愿存证链

```sequence

participant 查询节点 as E
participant 钱包 as U
participant 业务节点 as N
participant 对等网络 as N2
participant CTID网络 as C
participant 电子档案云 as D

U->U: 生成私钥公钥对
U->N: 请求绑定[上传公钥和KYC要素]
N->C: 请求EPID[上传用户标识和网络标识]
C->N: 下发EPID
N-->N2: 签发交易，将公钥和EPID绑定上链
N->U: 下发绑定成功通告
U->N: 私钥签发意愿存证
N-->N2: 验证交易，打包上链
N-->D: 原始意愿材料存档
N->U: 下发意愿存证上链通知
E->N: 查询意愿存证
N->E: 下发查询结果
E->D: 调阅原始意愿材料[上传凭证编号,事先申请授权]
D->E: 返回原始意愿材料
E->C: 查询PID[上传EPID,事先申请授权]
C->E: 返回PID

```