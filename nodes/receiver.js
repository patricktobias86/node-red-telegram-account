const { NewMessage } = require("telegram/events");
const util = require("util");

module.exports = function (RED) {
  function Receiver(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    this.debugEnabled = config.debug;
    var node = this;
    const client =  this.config.client;
    const ignore = config.ignore.split(/\n/);

    const event = new NewMessage();
    const handler = (update) => {
        const debug = node.debugEnabled;
        if (debug) {
            node.log('receiver update: ' + util.inspect(update, { depth: null }));
        }
        if (update.message.fromId != null && !ignore.includes(update.message.fromId.userId.toString())) {
            const out = { payload: { update } };
            node.send(out);
            if (debug) {
                node.log('receiver output: ' + util.inspect(out, { depth: null }));
            }
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
