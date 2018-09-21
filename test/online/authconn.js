/**
 * 联机单元测试：本地全节点提供运行时环境
 */

const remote = require('../util/authConn')

describe('道具管理流程', () => {
    it('设定厂商和转移地址信息', async () => {
        let ret = await remote.execute('cp.list', []);
        if(!!ret && ret.length>0) {
            console.log(ret);
        }
        else {
            console.log('厂商列表为空');
        }
    });
});
