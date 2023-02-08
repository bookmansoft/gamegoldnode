let express = require('express')

/**
 * 添加一个静态内容服务站
 * @description 相比通过 facade.boot 传入 static 数组而言，该方法能灵活指定协议、地址和端口
 * 
 * @param {*} protocol          协议 http / https
 * @param {*} host              主机地址
 * @param {*} port              主机端口
 * @param {Object} route        路由设置
 */
function addWebSite(protocol, host, port, route) {
  let app = express();
  if(Array.isArray(route)) {
      route.map(rt => {
          if(typeof rt.dir == 'string') {
              app.use(rt.path, express.static(rt.dir));
          } else if(typeof rt.dir == 'function') {
              let router = express.Router();
              router.request(path, async (req, res) => {
                  try {
                      res.send(await rt.dir(req.query));
                  } catch(e) {
                      res.end();
                      console.error(e);
                  }
              });
              app.use("/", router);
          }
      });
  }

  let httpObj = require(protocol);
  let hrv = httpObj.createServer(app);
  hrv.listen(port, host, () => {
      console.log(`静态网站服务在 ${protocol}://${host}:${port} 上准备就绪`);
  });
}

module.exports = addWebSite;
