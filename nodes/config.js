const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const activeClients = {}; // Cache: session string → connected client

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
            this.client = activeClients[sessionStr];
            node.status({ fill: "green", shape: "dot", text: "Reused existing client" });
        } else {
            // Create and connect new client
            this.client = new TelegramClient(this.session, apiId, apiHash, {
                connectionRetries: config.connectionRetries || 5,
                autoReconnect: config.autoReconnect !== false,
                requestRetries: config.requestRetries || 5,
            });

            this.client.connect().then(async () => {
                const authorized = await this.client.isUserAuthorized();
                if (!authorized) {
                    node.error("Session is invalid");
                } else {
                    node.status({ fill: "green", shape: "dot", text: "Connected" });
                    activeClients[sessionStr] = this.client;
                }
            }).catch(err => {
                node.error("Connection error: " + err.message);
            });
        }

        this.on("close", async () => {
            if (this.client && activeClients[sessionStr] === this.client) {
                await this.client.disconnect();
                delete activeClients[sessionStr];
                node.status({ fill: "red", shape: "ring", text: "Disconnected" });
            }
        });
    }

    RED.nodes.registerType('config', TelegramClientConfig);
};
