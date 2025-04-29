const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

module.exports = function (RED) {
    function TelegramClientConfig(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.on("input", async (msg) => {
            const api_idString = msg.payload.api_id || config.api_id;
            const api_hash = msg.payload.api_hash || config.api_hash;
            const phoneNumber = msg.payload.phoneNumber || config.phoneNumber;
            const password = msg.payload.password || config.password;
            const api_id = parseInt(api_idString);

            const session = new StringSession("");
            const client = new TelegramClient(session, api_id, api_hash, {
                connectionRetries: 5,
            });

 
            let resolvePhoneCode;
            const context = node.context().flow;

            try {
                await client.start({
                    phoneNumber: () => phoneNumber,
                    password: () => password,
                    phoneCode: async () =>{
                        return new Promise((resolve) => {
                            resolvePhoneCode = resolve;
                            context.set("phoneCode", resolvePhoneCode);
                        })
                    },
                    onError: (err) => node.error(`Ошибка: ${err.message}`),
                });

                const stringSession = client.session.save(); // Сохраняем сессию
                node.send({
                    topic: "auth_success",
                    payload: {
                        stringSession,
                        message: "Авторизация прошла успешно!",
                    },
                });
               
            } catch (error) {
                node.error(`Ошибка авторизации: ${error.message}`);
                node.send({
                    topic: "auth_error",
                    payload: {
                        error: error.message,
                    },
                });
            }
        });
    }

    RED.nodes.registerType("auth", TelegramClientConfig);
};
