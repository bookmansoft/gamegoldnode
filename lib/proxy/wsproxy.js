'use strict';

const assert = require('assert');
const net = require('net');
const EventEmitter = require('events');
const io = require('socket.io');
const util = require('./util');
const digest = require('./digest');
const IP = require('./ip');
const BufferWriter = require('./writer');

const TARGET = Buffer.from(
  '0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  'hex');

/**
 * 桥接器管理者，为每个进入的ws维护一个桥接器，负责报文的中转，以及异常事件的处理
 * @param {*} options 
 */

class WSProxy extends EventEmitter
{
  constructor(options) {
    super();
  
    if (!options) {
      options = {};
    }
  
    this.options = options;
    this.target = options.target || TARGET;   //目标，猜测是用于联合挖矿
    this.pow = options.pow === true;          //客户端是否支持POW

    this.io = new io({
      origins: '*:*',
      transports: ['websocket'],
      serveClient: false
    });

    //将socket.io对象附着在 web Server 上
    this.io.attach(options.server, {origins: '*:*'});

    this.sockets = new Map();                 //连接对象缓存列表，以ws连接为索引，以ts连接管理者为值
    this.ports = new Set();                   //白名单：允许连接的端口列表
    if (options.ports) {                      //建立允许连接的端口白名单
      for (const port of options.ports) {
        this.ports.add(port);
      }
    }
  
    this.init();
  }

  init() {
    this.on('error', (err) => {
      console.error(err.stack);
    });

    this.io.on('error', (err) => {
      this.emit('error', err);
    });
  
    this.io.on('connection', (ws) => {
      //对进入的ws连接做出反应，试图为其建立桥接器
      this.handleWebSocketIn(ws);
    });
  };
  
  /**
   * ws连接事件的处理函数：对进入的ws连接做出反应，试图为其建立桥接器
   * @param {*} ws 
   */
  handleWebSocketIn(ws) {
    //建立桥接器对象
    const state = new SocketState(this, ws);
  
    //缓存桥接器，Use a weak map to avoid mutating the websocket object.
    this.sockets.set(ws, state);
    
    //向端口写入info数据
    ws.emit('info', state.toInfo());
  
    ws.on('error', (err) => {
      //捕获错误事件
      this.emit('error', err);
    });
  
    ws.on('tcp connect', (port, host, nonce) => {
      //监控 客户端上行的 'tcp connect' 事件，准备进行tcp连接
      this.handleTcpConnect(ws, port, host, nonce);
    });
  };
  
  /**
   * 客户端上行的 'tcp connect' 事件的处理函数
   * @param {*} ws 
   * @param {*} port 
   * @param {*} host 
   * @param {*} nonce 
   */
  handleTcpConnect(ws, port, host, nonce) {
    const state = this.sockets.get(ws); //取出先前缓存的桥接器
    assert(state);
  
    if (state.socket) { //已经建立过连接了，会自动重连的
      this.log('Client is trying to reconnect (%s).', state.host);
      return;
    }
  
    if (!util.isU16(port)
        || typeof host !== 'string'
        || host.length === 0) {
      this.log('Client gave bad arguments (%s).', state.host);
      ws.emit('tcp close');
      ws.disconnect();
      return;
    }
  
    if (this.pow) {
      if (!util.isU32(nonce)) {
        this.log('Client did not solve proof of work (%s).', state.host);
        ws.emit('tcp close');
        ws.disconnect();
        return;
      }
  
      const bw = new BufferWriter();
      bw.writeU32(nonce);
      bw.writeBytes(state.snonce);
      bw.writeU32(port);
      bw.writeString(host, 'ascii');
  
      const pow = bw.render();
  
      if (digest.hash256(pow).compare(this.target) > 0) {
        this.log('Client did not solve proof of work (%s).', state.host);
        ws.emit('tcp close');
        ws.disconnect();
        return;
      }
    }
  
    let raw, addr;
    try {
      raw = IP.toBuffer(host);
      addr = IP.toString(raw);
    } catch (e) {
      this.log('Client gave a bad host: %s (%s).', host, state.host);
      ws.emit('tcp error', {
        message: 'EHOSTUNREACH',
        code: 'EHOSTUNREACH'
      });
      ws.disconnect();
      return;
    }
  
    if (!IP.isRoutable(raw) || IP.isOnion(raw)) {
      this.log(
        'Client is trying to connect to a bad ip: %s (%s).',
        addr, state.host);
      ws.emit('tcp error', {
        message: 'ENETUNREACH',
        code: 'ENETUNREACH'
      });
      ws.disconnect();
      return;
    }
  
    if (!this.ports.has(port)) {
      this.log('Client is connecting to non-whitelist port (%s).', state.host);
      ws.emit('tcp error', {
        message: 'ENETUNREACH',
        code: 'ENETUNREACH'
      });
      ws.disconnect();
      return;
    }
  
    let socket;
    try {
      //桥接器准备建立和ws连接相桥接的ts连接
      socket = state.connect(port, addr);
      this.log('Connecting to %s (%s).', state.remoteHost, state.host);
    } catch (e) {
      this.log(e.message);
      this.log('Closing %s (%s).', state.remoteHost, state.host);
      ws.emit('tcp error', {
        message: 'ENETUNREACH',
        code: 'ENETUNREACH'
      });
      ws.disconnect();
      return;
    }
  
    //#region 为ws建立系列事件监控
    ws.on('tcp data', (data) => {
      //监控客户端上行的 'tcp data' 事件，将收到的数据写入ts端口
      if (typeof data !== 'string')
        return;
      socket.write(Buffer.from(data, 'hex'));
    });
  
    ws.on('tcp keep alive', (enable, delay) => {
      socket.setKeepAlive(enable, delay);
    });
  
    ws.on('tcp no delay', (enable) => {
      socket.setNoDelay(enable);
    });
  
    ws.on('tcp set timeout', (timeout) => {
      socket.setTimeout(timeout);
    });
  
    ws.on('tcp pause', () => {
      socket.pause();
    });
  
    ws.on('tcp resume', () => {
      socket.resume();
    });
  
    ws.on('disconnect', () => {
      socket.destroy();
    });
    //#endregion
  
    //#region 为ts建立系列事件监控
    socket.on('connect', () => {
      //监控tcp端口的连接事件，发送 'tcp connect' 事件到客户端
      ws.emit('tcp connect', socket.remoteAddress, socket.remotePort);
    });
  
    socket.on('data', (data) => {
      //监控tcp端口的数据到达事件，发送 'tcp data' 事件到客户端
      ws.emit('tcp data', data.toString('hex'));
    });
  
    socket.on('error', (err) => {
      ws.emit('tcp error', {
        message: err.message,
        code: err.code || null
      });
    });
  
    socket.on('timeout', () => {
      ws.emit('tcp timeout');
    });
  
    socket.on('close', () => {
      this.log('Closing %s (%s).', state.remoteHost, state.host);
      ws.emit('tcp close');
      ws.disconnect();
    });
    //#endregion
  };

  log(...args) {
    process.stdout.write('wsproxy: ');
    console.log(...args);
  };
}

/**
 * 桥接器
 * @param {*} server 
 * @param {*} socket 
 */
class SocketState
{
  /**
   * 构造函数
   * @param {*} server  管理所有桥接器的容器对象
   * @param {*} ws      ws连接对象
   */
  constructor(server, ws) {
    this.pow = server.pow;
    this.target = server.target;
    this.snonce = util.nonce();
    this.socket = null;
    this.host = IP.normalize(ws.conn.remoteAddress);
    this.remoteHost = null;
  }

  toInfo() {
    return {
      pow: this.pow,
      target: this.target.toString('hex'),
      snonce: this.snonce.toString('hex')
    };
  };
  
  connect(port, host) {
    this.socket = net.connect(port, host);
    this.remoteHost = IP.toHostname(host, port);
    return this.socket;
  };
}

module.exports = WSProxy;
