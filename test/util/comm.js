const MAX_INT = Math.pow(2, 53) -1;

/**
 * 客户端请求返回值，统一定义所有的错误码，每100个为一个大类
 */
const ReturnCode = {
    Success: 0,             //操作成功
    userIllegal: 1,         //非法用户
};

const ReturnCodeName = {
    0:'操作成功',
    1:'非法用户',
};

/**
 * 通讯模式
 */
const CommMode = {
    ws: "webSocket",    //Web Socket
    get: "get",         //HTTP GET
    post: "post",       //HTTP POST
}

/**
 * 下行消息类型
 */
const NotifyType = {
    version: 'version',
};

/**
 * 中间件参数对象
 */
const MiddlewareParam = {
    /**
     * 通讯组件
     */
    socket:null, 
    /**
     * 消息
     */
    msg:{}, 
    /**
     * 回调函数
     */
    fn: null, 
    /**
     * 中继标志：true 按顺序传递信息流到下一个中间件 false 终止传递
     */
    recy:true, 
    /**
     * 核心对象
     */
    facade: null
};

exports = module.exports = {
    ReturnCode: ReturnCode,
    ReturnCodeName: ReturnCodeName,
    NotifyType: NotifyType,
    CommMode: CommMode,
    MAX_INT:MAX_INT,
    MiddlewareParam:MiddlewareParam,
};
