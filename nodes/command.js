const { NewMessage } = require("telegram/events");


module.exports = function (RED) {
  function Command(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    var node = this;
    /** @type {TelegramClient} */
    const client =  this.config.client;

    const event = new NewMessage();
    const handler = (update) => {
        const message = update.message.message;
        if (message) {
            if (config.regex) {
                const regex = new RegExp(config.command);

                if (regex.test(message)) {
                    var msg = {
                        payload: {
                            update
                        }
                    };
                    node.send(msg);
                }
            } else if (message === config.command) {
                var msg = {
                    payload: {
                        update
                    }
                };
                node.send(msg);
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

  RED.nodes.registerType('command', Command);
};
