/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */
let remote = require('../util/clientComm')()
let {ReturnCodeName, CommMode, ReturnCode, NotifyType} = require('../util/comm'); //常量

describe('区块相关的JSONP', function() {
    it('获取近期区块列表', done => {
        remote.mode(CommMode.get).fetch(
            {}, 
            /**
             * JSONP回调函数，注意是标准的双参数机制
             * @param {*} err 如果远程调用发生错误，该参数应该设置为非空，且携带错误信息，否则为空
             * @param {*} msg 远程调用返回值
             */
            function (err, msg) {
                console.log(msg);
                done();
            },
            'public/blocks',
        );
    });

    it('获取同步状态', done => {
        remote.mode(CommMode.ws).fetch({method:'isSynced', params:[]}, (err, msg) => {
            console.log(msg);
            done();
        });
    });

    it('获取区块概要信息', done => {
        remote.mode(CommMode.ws).fetch({method:'getBlockOverview', params:['d798755ecd93f9cbbbd4fa726972fc0b3c4a1656bdfc8ab4f1d02d1aaed2ed5b']}, (err, msg) => {
            console.log(msg);
            done();
        });
    });

    it('获取区块原始信息', done => {
        remote.mode(CommMode.ws).fetch({method:'getRawBlock', params:['d798755ecd93f9cbbbd4fa726972fc0b3c4a1656bdfc8ab4f1d02d1aaed2ed5b']}, (err, msg) => {
            console.log(msg);
            done();
        });
    });

    it('获取概要信息', done => {
        remote.mode(CommMode.ws).fetch({method:'getInfo', params:[]}, (err, msg) => {
            console.log(msg);
            done();
        });
    });
});
