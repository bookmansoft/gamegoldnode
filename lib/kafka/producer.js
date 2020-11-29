const kafka = require('./connector')

//创建生产者
const producer = kafka.producer();

(async () => {
  //连接到kafka代理
  await producer.connect();
  //发送特定主题的消息
  for(let i = 0; i < 10; i++) {
    await producer.send({
        topic: 'vallnet',
        messages: [
          { value: 'Hello vallnet!' },
        ],
    })
  }

  await producer.disconnect();
})().catch(console.error);