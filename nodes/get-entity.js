module.exports = function (RED) {
    function GetEntity(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        this.debugEnabled = config.debug;
        var node = this;

        this.on('input', async function (msg) {
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('get-entity input: ' + JSON.stringify(msg));
            }
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

                const out = { payload: { input: entity } };
                node.send(out);
                if (debug) {
                    node.log('get-entity output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error getting entity: ' + err.message);
                const out = { payload: { input: null } };
                node.send(out);
                if (debug) {
                    node.log('get-entity output: ' + JSON.stringify(out));
                }
            }
        });
    }

    RED.nodes.registerType('get-entity', GetEntity);
};
