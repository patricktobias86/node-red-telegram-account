module.exports = function(RED) {
    function ResolveUserId(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function(msg) {
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
                node.send({ payload: { userId } });
            } catch (err) {
                node.error('Error resolving username: ' + err.message);
                node.send({ payload: { userId: null } });
            }
        });
    }
    RED.nodes.registerType('resolve-userid', ResolveUserId);
};
