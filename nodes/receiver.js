const { NewMessage } = require("telegram/events");

module.exports = function (RED) {
  function Receiver(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    var node = this;
    const client =  this.config.client;
    const ignore = config.ignore.split(/\n/);

    const event = new NewMessage();
    const handler = (update) => {
        if (update.message.fromId != null && !ignore.includes(update.message.fromId.userId.toString())) {
            node.send({
                payload: {
                    update
                }
            });
        }
    };

    try {
      client.addEventHandler(handler, event);
    } catch (err) {
      node.error('Authorization error: ' + err.message);
    }

    this.on('close', () => {
      try {
        client.removeEventHandler(handler, event);
      } catch (err) {
        node.error('Handler removal error: ' + err.message);
      }
    });

  }

  RED.nodes.registerType('receiver', Receiver);
};
