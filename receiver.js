const { NewMessage } = require("telegram/events");

module.exports = function (RED) {
  function Receiver(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    var node = this;
    const client =  this.config.client;
    const ignore = config.ignore.split(/\n/);

  
    try {
      client.addEventHandler((update) => {
        if(update.message.fromId != null && !ignore.includes(update.message.fromId.userId.toString())){
          
          node.send({
            payload:{
              update
            }
          } )
        }
        
      }, new NewMessage());
      
    } catch (err) {
      node.error('Ошибка авторизации: ' + err.message);
    }

  }

  RED.nodes.registerType('receiver', Receiver);
};
