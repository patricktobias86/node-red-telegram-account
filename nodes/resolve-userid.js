module.exports = function(RED) {
    function ResolveUserId(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        this.debugEnabled = config.debug;
        var node = this;

        this.on('input', async function(msg) {
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('resolve-userid input: ' + JSON.stringify(msg));
            }
            const username = msg.payload?.username || config.username;
            const client = msg.payload?.client ? msg.payload.client : node.config?.client;

            if (!username) {
                node.error('No username provided');
                return;
            }
            if (!client) {
                node.error('Telegram client not configured');
                return;
            }

            try {
                const entity = await client.getEntity(username);
                let userId;
                if (entity?.id) {
                    userId = entity.id;
                } else if (entity?.userId) {
                    userId = entity.userId;
                }
                const out = { payload: { userId } };
                node.send(out);
                if (debug) {
                    node.log('resolve-userid output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error resolving username: ' + err.message);
                const out = { payload: { userId: null } };
                node.send(out);
                if (debug) {
                    node.log('resolve-userid output: ' + JSON.stringify(out));
                }
            }
        });
    }
    RED.nodes.registerType('resolve-userid', ResolveUserId);
};
