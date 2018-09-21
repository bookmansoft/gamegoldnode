/**
 * 单元测试：系统状态相关的 API
 * Creted by liub 2018.9.11
 */
let remote = require('../util/publicConn')()
let {ReturnCodeName, CommMode, ReturnCode, NotifyType} = require('../util/comm'); //常量

describe.skip('区块相关的JSONP', function() {
    it('获取同步状态', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {
                console.log(msg);
                done();
            },
            'public/sync',
        );
    });

    it('获取手续费信息', done => {
        remote.mode(CommMode.ws).fetch({method: 'estimateFee', params:['2']}, function (err, msg) {
            console.log(msg);
            done();
        });
    });

    it('获取汇率', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {
                console.log(msg);
                done();
            },
            'public/currency',
        );
    });

    it('获取主管道信息', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {
                console.log(msg);
                done();
            },
            'public/peer',
        );
    });

    it('获取手续费信息', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {
                console.log(msg);
                done();
            },
            'public/utils/estimatefee',
        );
    });

    it('获取版本信息', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {
                console.log(msg);
                done();
            },
            'public/version',
        );
    });

    it('获取状态信息', done => {
        remote.mode(CommMode.get).fetch({}, function (err, msg) {
                console.log(msg);
                done();
            },
            'public/status',
        );
    });

    it('获取同步状态', done => {
        remote.mode(CommMode.ws).fetch({method:'isSynced', params:[]}, (err, msg) => {
            console.log(msg);
            done();
        });
    });

    it('获取同步进度百分比数值', done => {
        remote.mode(CommMode.ws).fetch({method:'syncPercentage', params:[]}, (err, msg) => {
            console.log(msg);
            done();
        });
    });

    it('获取区块头哈希', done => {
        remote.mode(CommMode.ws).fetch({method:'getBestBlockHash', params:[]}, (err, msg) => {
            console.log(msg);
            done();
        });
    });
    

    it('获取支持币种', done => {
        remote.mode(CommMode.get).fetch({}, (err, msg) => {
            console.log(msg);
            done();
        }, 'public/explorers');
    });
});
