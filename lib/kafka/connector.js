const { Kafka } = require('kafkajs');
const fs = require('fs');
const bodyParser = require('body-parser');

let brokerParam = [];

var pattenIp=/^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\:([0-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-5]{2}[0-3][0-5])$/;
if (process.env.brokers){
    let brokerArray = process.env.brokers.split(",");
    brokerArray.forEach(parseString => {
        if(pattenIp.test(parseString) == true){
            brokerParam.push(parseString);         
        }
    });
}
else{
    brokerParam.push("49.4.31.216:9095");
}

let params = {
    groupId: 'vallnet-group-1',
    topic: 'chain_contract_response_queue',
    clientId: 'my-app',
    brokers: brokerParam,
    // ssl: {
    //     rejectUnauthorized: false,
    //     ca: [fs.readFileSync('/my/custom/ca.crt', 'utf-8')],
    //     key: fs.readFileSync('/my/custom/client-key.pem', 'utf-8'),
    //     cert: fs.readFileSync('/my/custom/client-cert.pem', 'utf-8')
    // },
    // sasl: {
    //     mechanism: 'plain', // scram-sha-256 or scram-sha-512
    //     username: 'gamegold',
    //     password: 'Bookman920'
    // },    
}

const kafka = new Kafka({
    clientId: params.clientId,
    brokers: params.brokers,
    // ssl: params.ssl,
    // sasl: params.sasl,
});

kafka.extraParams = params;

module.exports = kafka;