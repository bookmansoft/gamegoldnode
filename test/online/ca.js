/**
 * 单元测试：GIP0024
 * Creted by liub 2020.04.20
 */

const assert = require('assert');
const remote = (require('./connector'))();

let env = {};

describe('GIP0024', function() {
    it('签署证书', async () => {
        let ret = await remote.execute('ca.issue', [
            '7af33f30-83c1-11ea-b8ae-e1a1e13aa8c1',                             //cid
            '',                                                                 //name
            'tb1q0h3thutw4jl6hrse59493nkeg36he7dkgnt8lg',                       //address
            'b2f1083c1e8d68eeab9b20a455048e415ef80d440a7a77e4a771b70a719ef305'  //content hash
        ]);
        assert(ret.erid);
        env.erid = ret.erid;

        await remote.execute('miner.generate.admin', [1]);
    });

    it('查询证书', async () => {
        let ret = await remote.execute('ca.list.cert', [[['erid', env.erid]]]);
        assert(ret.list[0].erid == env.erid);
    });

    it('校验证书', async () => {
        let ret = await remote.execute('ca.verify', [env.erid]);
        assert(ret);
    });
});