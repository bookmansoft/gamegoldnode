/**
 * 开放式连接器
 * 可以用于 node 环境下的服务端程序/单元测试，以 GET / POST / WS 等多种模式，访问远程全节点的开放式API
 */

/**
 * 取数组随机对象
 */
Array.prototype.randObj = function(){
    if(this.length == 0){
        return null;
    }
    else if(this.length == 1){
        return this[0];
    }
    else{
        return this[(Math.random()*this.length)|0];
    }
}

let Indicator = require('./Indicator'); //标志位管理
let {ReturnCodeName, CommMode, ReturnCode, NotifyType} = require('./comm'); //常量
let expect = require('chai').expect; //断言库
let req = require('./req'); //http访问

/**
 * RPC控件
 * @note
 *      1、根据创建参数，可分别支持WS、Socket、Http三种常用通讯模式，支持Notify、JSONP、Watching等报文通讯模式
 *      2、支持LBS重定向功能
 *      3、内部封装了一定的断言功能
 */
class Remote {
    constructor($mode = CommMode.ws){
        this.config = {
            webserver: {
                host: '127.0.0.1',
                port: '17332',
            },
            UrlHead: 'http',
            rpcMode: $mode,
        }
        this.indicator = Indicator.inst();
        this.expect = expect;

        /*通过使用统一的socket来保持包含多个交互过程的会话*/
        this.createSocket(this.config.webserver.host, this.config.webserver.port);
    }

    mode($mode = CommMode.http, $head = 'http') {
        this.config.rpcMode = $mode;
        this.config.UrlHead = $head;

        return this;
    }

    /**
     * 创建通讯连接组件
     * @param {*} ip 
     * @param {*} port 
     */
    createSocket(ip, port){
        this.close();

        let uri = `${this.config.UrlHead}://${ip}:${port}`;
        this.socket = require('socket.io-client')(uri, {'force new connection': true});
    }

    /**
     * 设置服务端推送报文的监控句柄，支持链式调用
     * @param cb            回调
     * @param etype
     * @returns {Remote}
     */
    watch(cb, etype) {
        this.socket.on(etype, cb);
        return this;
    }

    /**
     * 判断返回值是否成功
     * @param msg       网络报文
     * @param out       强制打印日志
     * @returns {*}
     */
    isSuccess(msg, out=false){
        this.expect(msg).to.not.be.empty;
        msg.msg = ReturnCodeName[msg.code];

        if((msg.code != ReturnCode.Success) || out){
            this.log(msg);
        }
        return this.expect(msg.code).to.be.equal(ReturnCode.Success);
    }

    /**
     * 直接打印各种对象
     * @param val
     */
    log(val){
        if(!val){
            console.log('undefined');
            return;
        }

        if(!!val.code){
            val.msg = ReturnCodeName[val.code];
        }

        switch(typeof val){
            case 'number':
            case 'string':
            case 'boolean':
                console.log(val);
                break;
            case 'function':
                console.log(val());
                break;
            case 'undefined':
                console.log('err: undefined');
                break;
            default:
                console.log(JSON.stringify(val));
                break;
        }
    }

    /**
     * 添加某项设定
     * @param param
     * @returns {Remote}
     */
    set(param){
        this.indicator.set(param);
        return this;
    }

    /**
     * 取消某项设定
     * @param param
     * @returns {Remote}
     */
    unSet(param){
        this.indicator.unSet(param);
        return this;
    }

    get newone(){
        return new Remote();
    }

    /**
     * 获取新的远程对象
      * @returns {Remote}
     */
    get new(){
        return new Remote();
    }

    /**
     * 向服务端提交请求,默认JSONP模式
     * @param args          命令参数，JSON对象
     * @param callback      回调函数
     * @param url           HTTP/HTTPS模式下的URI参数
     * @returns {*}
     */
    fetch(args, callback, url) {
        switch(this.config.rpcMode){
            case CommMode.ws:
                if(!callback) {
                    this.socket.emit(args.method, ...args.params);
                }
                else {
                    this.socket.emit(args.method, ...args.params, callback);
                }
                break;

            case CommMode.get:
                this.$UrlRequest(args, callback, url);
                break;

            case CommMode.post:
                this.$UrlPost(args, callback, url);
                break;
        }

        return this;
    }

    /**
     * 设定远程服务器地址
     * @param ip
     * @param port
     * @returns {Remote}
     */
    locate(ip, port){
        this.config.webserver.host = ip;
        this.config.webserver.port = port;

        this.createSocket(ip, port);
        return this;
    }

    /**
     * 关闭长连接
     */
    close(){
        if(this.socket){
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * (内部函数)发起基于Http GET的RPC请求
     * @param params
     * @param callback
     * @param url
     * @constructor
     */
    $UrlRequest(params, callback, url) {
        url = `${this.config.UrlHead}://${this.config.webserver.host}:${this.config.webserver.port}/${url}`;
        let query = Object.keys(params).reduce((ret, next) => {
                if(ret != ''){ ret += '&'; }
                return ret + next + "=" + ((typeof params[next]) == "object" ? JSON.stringify(params[next]) : params[next]);
            }, '');
        if(query != '') {
            query = '?' + query;
        }
        url = `${url}${query}`;
        req.pGetUrl(url).then(data => callback(null, data)).catch(err => callback(err));
    }

    /**
     * (内部函数)发起基于Http POST的RPC请求
     * @param params
     * @param callback
     * @param url
     * @constructor
     */
    $UrlPost(params, callback, url) {
        url = `${this.config.UrlHead}://${this.config.webserver.host}:${this.config.webserver.port}/${url}`;
        req.pPostUrl(url, params).then(data => callback(null, data)).catch(err => callback(err));
    }
}

exports = module.exports = function($mode){
    return new Remote($mode);
};