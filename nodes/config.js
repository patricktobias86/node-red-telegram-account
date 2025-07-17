const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const activeClients = {}; // Cache: session string → { client, refCount }

module.exports = function (RED) {
    function TelegramClientConfig(config) {
        RED.nodes.createNode(this, config);

        const sessionStr = config.session;
        const apiId = parseInt(config.api_id);
        const apiHash = config.api_hash;

        this.session = new StringSession(sessionStr);
        this.client = null;

        const node = this;

        if (activeClients[sessionStr]) {
            // Reuse existing client
            const record = activeClients[sessionStr];
            this.client = record.client;
            record.refCount += 1;
            node.status({ fill: "green", shape: "dot", text: "Reused existing client" });
        } else {
            // Create and connect new client
            this.client = new TelegramClient(this.session, apiId, apiHash, {
                connectionRetries: config.connectionRetries || 5,
                autoReconnect: config.autoReconnect !== false,
                requestRetries: config.requestRetries || 5,
            });

            // Pre-store with refCount to ensure reuse during connection setup
            activeClients[sessionStr] = { client: this.client, refCount: 1 };

            this.client.connect().then(async () => {
                const authorized = await this.client.isUserAuthorized();
                if (!authorized) {
                    node.error("Session is invalid");
                } else {
                    node.status({ fill: "green", shape: "dot", text: "Connected" });
                }
            }).catch(err => {
                node.error("Connection error: " + err.message);
                delete activeClients[sessionStr];
            });
        }

        this.on("close", async () => {
            const record = activeClients[sessionStr];
            if (record && record.client === this.client) {
                record.refCount -= 1;
                if (record.refCount <= 0) {
                    try {
                        await this.client.disconnect();
                    } catch (err) {
                        node.error("Disconnect error: " + err.message);
                    }
                    delete activeClients[sessionStr];
                    node.status({ fill: "red", shape: "ring", text: "Disconnected" });
                }
            }
        });
    }

    RED.nodes.registerType('config', TelegramClientConfig);
};
