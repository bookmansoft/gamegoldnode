const kafka = require('./connector')

//创建消费者，为消费者设定好组别
const consumer = kafka.consumer({ groupId: 'bookman-group-1' });

(async () => {
  //#region 
  
  //连接到kafka代理
  await consumer.connect()
  //订阅特定主题
  await consumer.subscribe({ topic: 'vallnet', fromBeginning: true })
  //持续监听消息，打印收到的消息内容
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log({
        topic,
        partition,
        offset: message.offset,
        value: message.value.toString(),
      })
    },
  })

  //#endregion
})().catch(console.error);