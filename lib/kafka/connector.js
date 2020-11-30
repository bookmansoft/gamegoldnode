const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['119.3.240.91:9094','117.78.16.193:9094','49.4.0.61:9094',]
});

module.exports = kafka;