const kafka = require('../lib/remote/connector')

//创建生产者
const producer = kafka.producer();

(async () => {
  //连接到kafka代理
  await producer.connect();
  //发送特定主题的消息
  await producer.send({
    topic: kafka.extraParams.topic,
    messages: [
      { value: 'Hello vallnet!' },
    ],
  })

  await producer.disconnect();
})().catch(console.error);