const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

module.exports = function (RED) {
    function TelegramClientConfig(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.on("input", async (msg) => {
            const api_id = parseInt(msg.payload.api_id || config.api_id);
            const api_hash = msg.payload.api_hash || config.api_hash;
            const phoneNumber = msg.payload.phoneNumber || config.phoneNumber;
            const password = msg.payload.password || config.password;

            const session = new StringSession(""); // always generate a new session
            const client = new TelegramClient(session, api_id, api_hash, {
                connectionRetries: 5,
            });

            const context = node.context().flow;

            let phoneCodePromise = new Promise((resolve) => {
                context.set("waitForCode", resolve);
            });

            try {
                await client.start({
                    phoneNumber: () => phoneNumber,
                    password: () => password,
                    phoneCode: async () => {
                        node.status({ fill: "yellow", shape: "ring", text: "Waiting for code" });
                        const code = await phoneCodePromise;
                        return code;
                    },
                    onError: (err) => node.error("GramJS Error: " + err.message),
                });

                const stringSession = client.session.save();
                node.send({
                    topic: "auth_success",
                    payload: {
                        stringSession,
                        message: "Authorization successful!",
                    },
                });
                node.status({ fill: "green", shape: "dot", text: "Authenticated" });

            } catch (err) {
                node.error("Authentication failed: " + err.message);
                node.send({
                    topic: "auth_error",
                    payload: { error: err.message },
                });
                node.status({ fill: "red", shape: "ring", text: "Failed" });
            }
        });
    }

    RED.nodes.registerType("auth", TelegramClientConfig);
};
