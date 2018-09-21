/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const conn = require('../util/authconnector')

describe.only('道具管理流程', () => {
    it('设定厂商和转移地址信息', async () => {
        let ret = await conn.execute('cp.list', []);
        if(!!ret && ret.length>0) {
            console.log(ret[0]);
        }
        else {
            console.log('厂商列表为空');
        }
    });
});
