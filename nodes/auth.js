const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

module.exports = function (RED) {
    function TelegramClientConfig(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        this.debugEnabled = config.debug;

        this.on("input", async (msg) => {
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('auth input: ' + JSON.stringify(msg));
            }

            const payload = (msg && typeof msg.payload === "object") ? msg.payload : {};

            const api_id = parseInt(payload.api_id || config.api_id);
            const api_hash = payload.api_hash || config.api_hash;
            const phoneNumber = payload.phoneNumber || config.phoneNumber;
            const password = payload.password || config.password;

            if (!api_id || !api_hash || !phoneNumber) {
                node.error("Missing required API credentials (api_id, api_hash, or phoneNumber).");
                return;
            }

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

                console.log("Sending result to output:", {
                    stringSession,
                    messages: [
                        { type: "auth_success", text: "Authorization successful!" },
                        { type: "session_token", text: "Copy this stringSession to use in other nodes." }
                    ]
                });

                 const out = {
                     ...msg,
                     topic: "auth_success",
                     payload: {
                         stringSession,
                         message: "Authorization successful!"
                     }
                 };
                 node.send(out);
                 if (debug) {
                     node.log('auth output: ' + JSON.stringify(out));
                 }

                node.status({ fill: "green", shape: "dot", text: "Authenticated" });

            } catch (err) {
                 node.error("Authentication failed: " + err.message);
                 const out = { ...msg, topic: "auth_error", payload: { error: err.message } };
                 node.send(out);
                 if (debug) {
                     node.log('auth output: ' + JSON.stringify(out));
                 }
                node.status({ fill: "red", shape: "ring", text: "Failed" });
            }
        });
    }

    RED.nodes.registerType("auth", TelegramClientConfig);
};
