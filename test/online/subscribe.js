/**
 * 单元测试：地址相关的 JSONP
 * Creted by liub 2018.9.11
 */

let remote = require('../util/clientComm')()
let {ReturnCodeName, CommMode, ReturnCode, NotifyType} = require('../util/comm'); //常量

describe.skip('订阅与退订', function() {
    it('订阅区块消息', done => {
        remote.watch(msg=>{
            console.log(msg);
        }, 'p2p/block').mode(CommMode.ws).fetch({method:'subscribe', params:['p2p/block']}, (err, msg) => {
            remote.fetch({method:'unsubscribe', params:['p2p/block']}, (err, msg) => {
                done();
            });
        });
    });
});
