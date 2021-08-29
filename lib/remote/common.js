'use strict';

const assert = require('assert');
const common = exports;

common.revHex = function revHex(data) {
  assert(typeof data === 'string');
  assert(data.length > 0);
  assert(data.length % 2 === 0);

  let out = '';

  for (let i = 0; i < data.length; i += 2)
    out = data.slice(i, i + 2) + out;

  return out;
};

//节点配置信息
common.notes = [
  {name: 'root.0', ip: '127.0.0.1', port: 2102},
  {name: 'mchain.1', ip: '127.0.0.1', port: 2112},
  {name: 'mchain.2', ip: '127.0.0.1', port: 2122},
  {name: 'mchain.3', ip: '127.0.0.1', port: 2132},
];