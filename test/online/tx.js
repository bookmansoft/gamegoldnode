/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */
let remote = require('../util/publicConn')()
let Indicator = require('../util/Indicator'); //标志位管理
let {NotifyType, ReturnCode, CommMode} = require('../util/comm');

describe.skip('交易相关的JSONP', function() {
    it('获取相关的交易信息', done => {
        remote.fetch(
            {method:'getDetailedTransaction', params:['ef912e42d5538f4ef06271cdb66b47e05b28067000ecdf568a28c0ce26ebc19c']}, 
            function (err, msg) {
                console.log(msg);
                done();
            }
        );
    });
    it('获取相关的交易信息', done => {
        remote.fetch(
            {method:'getRawTransaction', params:['ef912e42d5538f4ef06271cdb66b47e05b28067000ecdf568a28c0ce26ebc19c']}, 
            function (err, msg) {
                console.log(msg);
                done();
            }
        );
    });
    it('获取相关的交易信息', done => {
        remote.fetch(
            {method:'getTransaction', params:['ef912e42d5538f4ef06271cdb66b47e05b28067000ecdf568a28c0ce26ebc19c']}, 
            function (err, msg) {
                console.log(msg);
                done();
            }
        );
    });

    it('从内存池查询交易信息', done => {
        remote.mode(CommMode.ws).fetch({method:'getMempoolTransaction', params:['802f945284eed5ea0dddf04b1d825677e3d9271267d3b18081cd2ca9406b0c79']}, (err, msg) => {
            console.log(msg);
            done();
        });
    });
});
