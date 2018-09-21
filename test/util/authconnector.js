const createHmac = require('create-hmac/browser');
const rp = require('request-promise');

const codeMessage = {
  200: '服务器成功返回请求的数据。',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）。',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作。',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器。',
  502: '网关错误。',
  503: '服务不可用，服务器暂时过载或维护。',
  504: '网关超时。',
};

/**
 * Requests a URL, returning a promise.
 *
 * @param  {object} [options] The options we want to pass to "fetch"
 * @return {object}           An object containing either "data" or "err"
 */
async function $req(options) {
  const defaultOptions = {
    credentials: 'include',
  };

  const newOptions = { ...defaultOptions, ...options };
  newOptions.json = true;
  newOptions.uri = `http://localhost:17332/`;

  if (
    newOptions.method === 'POST' ||
    newOptions.method === 'PUT' ||
    newOptions.method === 'DELETE'
  ) {
    if (!(newOptions.body instanceof FormData)) {
      newOptions.headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=utf-8',
        ...newOptions.headers,
      };
      newOptions.body = JSON.stringify(newOptions.body);
    } else {
      // newOptions.body is FormData
      newOptions.headers = {
        Accept: 'application/json',
        ...newOptions.headers,
      };
    }
  }

  try {
    return await rp(newOptions);
  }
  catch(e) {
    console.error(e);
  }
}

function Base64() {
	// private property
	const _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
 
	// private method for UTF-8 encoding
	const _utf8_encode = function (string) {
		string = string.replace(/\r\n/g,"\n");
		var utftext = "";
		for (var n = 0; n < string.length; n++) {
			var c = string.charCodeAt(n);
			if (c < 128) {
				utftext += String.fromCharCode(c);
			} else if((c > 127) && (c < 2048)) {
				utftext += String.fromCharCode((c >> 6) | 192);
				utftext += String.fromCharCode((c & 63) | 128);
			} else {
				utftext += String.fromCharCode((c >> 12) | 224);
				utftext += String.fromCharCode(((c >> 6) & 63) | 128);
				utftext += String.fromCharCode((c & 63) | 128);
			}
 
		}
		return utftext;
	}
 
	// private method for UTF-8 decoding
	const _utf8_decode = function (utftext) {
		var string = "";
		var i = 0;
		var c = c1 = c2 = 0;
		while ( i < utftext.length ) {
			c = utftext.charCodeAt(i);
			if (c < 128) {
				string += String.fromCharCode(c);
				i++;
			} else if((c > 191) && (c < 224)) {
				c2 = utftext.charCodeAt(i+1);
				string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
				i += 2;
			} else {
				c2 = utftext.charCodeAt(i+1);
				c3 = utftext.charCodeAt(i+2);
				string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
				i += 3;
			}
		}
		return string;
	}

  // public method for encoding
	this.encode = function (input) {
		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;
		input = _utf8_encode(input);
		while (i < input.length) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);
			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;
			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}
			output = output +
			_keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
			_keyStr.charAt(enc3) + _keyStr.charAt(enc4);
		}
		return output;
	}
 
	// public method for decoding
	this.decode = function (input) {
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		while (i < input.length) {
			enc1 = _keyStr.indexOf(input.charAt(i++));
			enc2 = _keyStr.indexOf(input.charAt(i++));
			enc3 = _keyStr.indexOf(input.charAt(i++));
			enc4 = _keyStr.indexOf(input.charAt(i++));
			chr1 = (enc1 << 2) | (enc2 >> 4);
			chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
			chr3 = ((enc3 & 3) << 6) | enc4;
			output = output + String.fromCharCode(chr1);
			if (enc3 != 64) {
				output = output + String.fromCharCode(chr2);
			}
			if (enc4 != 64) {
				output = output + String.fromCharCode(chr3);
			}
		}
		output = _utf8_decode(output);
		return output;
	}
}

function now() {
  return Math.floor(ms() / 1000);
};

/**
 * Get current time in unix time (milliseconds).
 * @returns {Number}
 */

function ms() {
  return Date.now();
};

/**
 * 终端配置管理
 */

const defaultNetworkType = 'testnet';

const main = {
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'terminal001',        //终端编码，作为访问远程钱包时的终端标识
    token:  '0340129aaa7a69ac10bfbf314b9b1ca8bdda5faecce1b6dab3e7c4178b99513392', //访问钱包时的令牌固定量，通过HMAC算法，将令牌随机量和令牌固定量合成为最终的访问令牌
};

const testnet = {
    apiKey: 'bookmansoft',        //远程服务器基本校验密码
    cid:    'terminal001',        //终端编码，作为访问远程钱包时的终端标识
    token:  '0340129aaa7a69ac10bfbf314b9b1ca8bdda5faecce1b6dab3e7c4178b99513392', //访问钱包时的令牌固定量，通过HMAC算法，将令牌随机量和令牌固定量合成为最终的访问令牌
};

/**
 * 获取终端配置
 * @param {*} networkType 
 */
function getTerminalConfig(networkType) {
  networkType = networkType || defaultNetworkType;

  switch(networkType) {
      case 'main' : {
          return main;
      }

      case 'testnet': {
          return testnet;
      }

      default: {
          return {};
      }
  }
}

let tconfig = getTerminalConfig();

const $params = {
  apiKey: tconfig.apiKey, //远程服务器基本校验密码
  cid: tconfig.cid, //终端编码，作为访问远程钱包时的终端标识
  token: tconfig.token, //访问钱包时的令牌固定量，通过HMAC算法，将令牌随机量和令牌固定量合成为最终的访问令牌
  id: 'primary', //默认访问的钱包编号
  random: null,
  randomTime: null,
};

function getRandom() {
  let _t = (now() / 120) | 0;
  $params.randomTime = $params.randomTime || _t;
  if (_t > $params.randomTime) {
    //有效期检测
    $params.random = null;
  }

  return $params.random;
}

function setRandom(val) {
  $params.random = val;
  if (!!val) {
    $params.randomTime = (now() / 120) | 0; //设置有效期
  }
}

/**
 * 利用HMAC算法，以及令牌固定量和令牌随机量，计算访问令牌
 * @param {*} token
 * @param {*} random
 */
function signHMAC(token, random) {
  var hmac = createHmac('sha256', random);
  let sig = hmac.update(token).digest('hex');
  return sig;
}

function fillOptions(options) {
  if (!options) {
    options = {};
  }
  if (!options.body) {
    options.body = {};
  }
  if (!options.headers) {
    options.headers = {};
  }

  let rnd = getRandom();
  if ($params.token && rnd) {
    options.body.token = signHMAC($params.token, rnd);
  }
  options.body.id = $params.id; //附加默认钱包编号
  options.body.cid = $params.cid; //附加客户端编号

  let auth = {
    username: 'bitcoinrpc',
    password: $params.apiKey || '',
  };
  var base = new Base64();
  var result = base.encode(`${auth.username}:${auth.password}`);
  options.headers.Authorization = `Basic ${result}`;
  return options;
}

async function queryToken() {
  let ret = getRandom();
  if (!ret) {
    ret = await $req(
      fillOptions({
        method: 'POST',
        body: {
          method: 'token.random',
          params: [$params.cid],
        },
      })
    );
    if(!!ret.error || !ret.result) {
      console.error(`HMAC请求错误`);
    }    
    console.log('fetched:', ret.result); // test only
    setRandom(ret.result); //获取令牌随机量
  }
}

/**
 * 访问游戏金节点的远程调用函数
 * @param {String}  method 调用方法名
 * @param {Array}   params 调用参数数组, ！！！注意不是带属性的参数对象
 */
export async function remoting(method, params) {
  await queryToken();

  params = params || [];

  let rt = await $req(
    fillOptions({
      method: 'POST',
      body: {
        method: method,
        params: params,
      },
    })
  );
  if(!!rt.error || !rt.result) {
    console.error(`${method}数据请求错误`);
  }    
  console.log('fetched:', rt.result); // test only

  return rt.result;
}
