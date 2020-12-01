const { Kafka } = require('kafkajs');
const fs = require('fs')

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['49.4.31.216:9095','119.3.244.114:9095','49.4.26.170:9095',],
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
});

module.exports = kafka;