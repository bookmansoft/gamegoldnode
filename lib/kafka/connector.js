const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'my-app',
    brokers: ['117.78.60.22:9094',]
});

module.exports = kafka;