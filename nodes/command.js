const { NewMessage } = require("telegram/events");


module.exports = function (RED) {
  function Command(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    this.debugEnabled = config.debug;
    var node = this;
    /** @type {TelegramClient} */
    const client =  this.config.client;

    const event = new NewMessage();
    const handler = (update) => {
        const debug = node.debugEnabled;
        const message = update.message.message;
        if (debug) {
            node.log('command update: ' + JSON.stringify(update));
        }
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
                    if (debug) {
                        node.log('command output: ' + JSON.stringify(msg));
                    }
                }
            } else if (message === config.command) {
                var msg = {
                    payload: {
                        update
                    }
                };
                node.send(msg);
                if (debug) {
                    node.log('command output: ' + JSON.stringify(msg));
                }
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
