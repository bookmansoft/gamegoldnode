/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */
let remote = require('../util/publicConn')()
let Indicator = require('../util/Indicator'); //标志位管理
let {NotifyType, ReturnCode, CommMode} = require('../util/comm');

// [    
// {
//     name: 'getUTXOByAddresses',
//     method: 'get',
//     path: '/public/addrs/:addr/utxo',
//     callback: getUTXO,
// },
// {
//     name: 'postUTXOByAddresses',
//     method: 'post',
//     path: '/public/addrs/utxo',
//     callback: getUTXO,
// },
// {
//     name: 'getTXSByAddresses',
//     method: 'get',
//     path: '/public/addrs/:addrs/txs',
//     callback: getTxs,
// },
// {
//     name: 'getBalanceByAddress',
//     method: 'get',
//     path: '/public/addr/:addr/balance',
//     callback: getBalance,
// },
// {
//     name: 'getUnconfirmedBalance',
//     method: 'get',
//     path: '/public/addr/:addr/unconfirmedBalance',
//     callback: getUnconfirmedBalance,
// },
// {
//     name: 'getTotalReceived',
//     method: 'get',
//     path: '/public/addr/:addr/totalReceived',
//     callback: getTotalReceived,
// },
// {
//     name: 'getTotalSent',
//     method: 'get',
//     path: '/public/addr/:addr/totalSent',
//     callback: getTotalSent,
// },
// ]

/**
 * 测试所用的地址
 */
let addr = 'tb1qdrdct4dlhh6wdulddy96h9lxgs9fekaffhyxz5';

describe.skip('地址相关的JSONP', function() {
    it('获取指定地址相关历史信息', done => {
        remote.fetch(
            {method:'getAddressHistory', params:['tb1qdrdct4dlhh6wdulddy96h9lxgs9fekaffhyxz5']},
            function (err, msg) {
                console.log(msg);
                done();
            }
        );
    });

    it('获取指定地址金额汇总信息', done => {
        remote.fetch(
            {method:'getAddressSummary', params:['tb1qdrdct4dlhh6wdulddy96h9lxgs9fekaffhyxz5']},
            function (err, msg) {
                console.log(msg);
                done();
            }
        );
    });
    
    it('获取指定地址UTXO集合', done => {
        remote.fetch(
            {method:'getAddressUnspentOutputs', params:['tb1qdrdct4dlhh6wdulddy96h9lxgs9fekaffhyxz5']},
            function (err, msg) {
                console.log(msg);
                done();
            }
        );
    });

    it('获取指定地址相关的交易ID列表', done => {
        remote.fetch({method:'getTxidsByAddress', params:['tb1qdrdct4dlhh6wdulddy96h9lxgs9fekaffhyxz5', 'input']}, (err, msg) => {
            console.log(msg);
            done();
        });
    });

    it('获取指定地址相关的交易列表', done => {
        remote.watch(msg => {
            console.log('receive notify:', msg);
        }, NotifyType.version).mode(CommMode.post).fetch(
            {addr:'f29bf2c260126e79d1da038c44314142d9010a6785c1c7c7ae2b023794f084e7'},
            /**
             * JSONP回调函数，注意是标准的双参数机制
             * @param {*} err 如果远程调用发生错误，该参数应该设置为非空，且携带错误信息，否则为空
             * @param {*} msg 远程调用返回值
             */
            function (err, msg) {
                console.log(msg);
                done();
            },
            'public/addrs/txs',
        );
    });

    it('获取指定地址的汇总信息', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {console.log(msg);done();},`public/addr/${addr}`);
    });

    it('获取指定地址的UTXO', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {console.log(msg);done();},`public/addr/${addr}/utxo`);
    });
});
