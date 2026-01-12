const { TelegramClient } = require("teleproto");
const { StringSession } = require("teleproto/sessions");

const activeClients = new Map(); // Cache: session string → { client, refCount, connecting }

module.exports = function (RED) {
    function TelegramClientConfig(config) {
        RED.nodes.createNode(this, config);
        this.debugEnabled = config.debug;

        const sessionStr = config.session;
        const apiId = parseInt(config.api_id);
        const apiHash = config.api_hash;

        this.session = new StringSession(sessionStr);
        this.client = null;

        const node = this;

        if (activeClients.has(sessionStr)) {
            // Reuse existing client
            const record = activeClients.get(sessionStr);
            this.client = record.client;
            record.refCount += 1;
            if (this.debugEnabled) {
                node.log('config: reusing existing client');
            }
            if (record.connecting) {
                node.status({ fill: "yellow", shape: "dot", text: "Waiting for connection" });
                record.connecting.then(() => {
                    node.status({ fill: "green", shape: "dot", text: "Reused existing client" });
                }).catch(err => node.error("Connection error: " + err.message));
            } else {
                node.status({ fill: "green", shape: "dot", text: "Reused existing client" });
            }
        } else {
            // Create and connect new client
            if (this.debugEnabled) {
                node.log('config: creating new client');
            }
            this.client = new TelegramClient(this.session, apiId, apiHash, {
                connectionRetries: config.connectionRetries || 5,
                autoReconnect: config.autoReconnect !== false,
                requestRetries: config.requestRetries || 5,
            });

            node.status({ fill: "yellow", shape: "ring", text: "Connecting" });

            const record = { client: this.client, refCount: 1, connecting: null };
            record.connecting = this.client.connect()
                .then(async () => {
                    const authorized = await this.client.isUserAuthorized();
                    if (!authorized) {
                        throw new Error("Session is invalid");
                    }
                })
                .then(() => {
                    node.status({ fill: "green", shape: "dot", text: "Connected" });
                    if (this.debugEnabled) {
                        node.log('config: connected');
                    }
                    record.connecting = null;
                })
                .catch(err => {
                    node.error("Connection error: " + err.message);
                    activeClients.delete(sessionStr);
                    record.connecting = null;
                });

            activeClients.set(sessionStr, record);
        }

        this.on("close", async () => {
            const record = activeClients.get(sessionStr);
            if (record && record.client === this.client) {
                record.refCount -= 1;
                if (record.refCount <= 0) {
                    if (this.debugEnabled) {
                        node.log('config: disconnecting client');
                    }
                    try {
                        await this.client.disconnect();
                    } catch (err) {
                        node.error("Disconnect error: " + err.message);
                    }
                    activeClients.delete(sessionStr);
                    node.status({ fill: "red", shape: "ring", text: "Disconnected" });
                }
            }
        });
    }

    RED.nodes.registerType('config', TelegramClientConfig);
};
