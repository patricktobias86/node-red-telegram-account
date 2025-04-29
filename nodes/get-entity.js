module.exports = function (RED) {
    function GetEntity(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function (msg) {
            const input = msg.payload.input || config.input;
              /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;

            try {
                let entity;

                // Check if the input is a URL
                if (input.includes('https://t.me/')) {
                    const username = input.split('/').pop();
                    entity = await client.getEntity(username);
                } else {
                    entity = await client.getEntity(input);
                }

                node.send({
                    payload: {input:entity},
                });
            } catch (err) {
                node.error('Error getting entity: ' + err.message);
                node.send({
                    payload:{ input: null}
                })
            }
        });
    }

    RED.nodes.registerType('get-entity', GetEntity);
};
