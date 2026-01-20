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

                // Check if the input is a Telegram URL and extract the username safely
                try {
                    const url = new URL(input);
                    const hostname = url.hostname.toLowerCase();

                    if (hostname === 't.me') {
                        const segments = url.pathname.split('/').filter(Boolean);
                        const username = segments[segments.length - 1];

                        if (username) {
                            entity = await client.getEntity(username);
                        } else {
                            entity = await client.getEntity(input);
                        }
                    } else {
                        entity = await client.getEntity(input);
                    }
                } catch (e) {
                    // Not a valid URL, treat input as a plain identifier
                    entity = await client.getEntity(input);
                }

                const out = { ...msg, payload: { input: entity } };
                node.send(out);
                if (debug) {
                    node.log('get-entity output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error getting entity: ' + err.message);
                const out = { ...msg, payload: { input: null } };
                node.send(out);
                if (debug) {
                    node.log('get-entity output: ' + JSON.stringify(out));
                }
            }
        });
    }

    RED.nodes.registerType('get-entity', GetEntity);
};
