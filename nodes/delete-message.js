module.exports = function (RED) {
    function DeleteMessage(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        this.debugEnabled = config.debug;
        var node = this;

        this.on('input', async function (msg) {
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('delete-message input: ' + JSON.stringify(msg));
            }
            const chatId = msg.payload.chatId || config.chatId;
            const messageIds = msg.payload.messageIds || config.messageIds;
            const revoke = msg.payload.revoke || config.revoke || { revoke: true };
              /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;

            try {
                const response = await client.deleteMessages(chatId, messageIds, revoke);

                const out = { payload: response };
                node.send(out);
                if (debug) {
                    node.log('delete-message output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error deleting message: ' + err.message);
            }
        });
    }

    RED.nodes.registerType('delete-message', DeleteMessage);
};
