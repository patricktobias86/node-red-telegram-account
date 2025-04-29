module.exports = function (RED) {
    function DeleteMessage(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function (msg) {
            const chatId = msg.payload.chatId || config.chatId;
            const messageIds = msg.payload.messageIds || config.messageIds;
            const revoke = msg.payload.revoke || config.revoke || { revoke: true };
              /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;

            try {
                const response = await client.deleteMessages(chatId, messageIds, revoke);

                node.send({
                    payload: response,
                });
            } catch (err) {
                node.error('Error deleting message: ' + err.message);
            }
        });
    }

    RED.nodes.registerType('delete-message', DeleteMessage);
};
