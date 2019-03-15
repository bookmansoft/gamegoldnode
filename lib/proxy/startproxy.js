const WSProxy = require('../proxy/wsproxy')
let express = require('express')
let app = express();
let bodyParser = require('body-parser')
let httpObj = require('http')

/**
 * 在 wshost:wsport 上启动 WSProxy
 * @param {*} params 
 */

function startproxy(params) {
  //启用跨域访问
  app.all('*',function (req, res, next) {
    //	允许应用的跨域访问
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

    if (req.method == 'OPTIONS') {
        //让options请求快速返回
        res.send(200);
    } else {
        next();
    }
  });

  //#region 添加POST模式下的body解析器
  app.use(bodyParser.urlencoded({extended: true}))
  app.use(bodyParser.json());
  //#endregion

  const server = httpObj.createServer(app);
  //需要配置节点所在的公网上的IP地址：
  let $host = params.node.config.str('wshost', '127.0.0.1');
  let $port = params.node.config.uint('wsport');
  server.listen($port, $host, () => {
    //  为SPV节点代理 WS-TCP 转换服务：创建桥接器管理者，负责为每一个进入的websocket连接分配一个桥接器，提供对等的 tcp socket 服务
    new WSProxy({
      server: server,
      pow: params.pow,      //客户端是否支持POW
      ports: params.ports   //白名单：允许连接的端口列表
    });
  });

  //下发404 必须在控制器路由、静态资源路由全部加载之后设定
  app.use(function(req, res, next) {
    res.status(404).send('Sorry cant find the path!');
  });

  //捕获并下发错误码 必须放在最后！
  app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
}

module.exports = startproxy;
