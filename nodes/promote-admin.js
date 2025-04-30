const { TelegramClient } = require("telegram");
const { parseID } = require("telegram/Utils");
const { Api } = require("telegram");

module.exports = function (RED) {
    function PromoteAdmin(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function (msg) {
            let chatId = msg.payload.chatId || config.chatId;
            let userId = msg.payload.userId || config.userId;
            let rank = msg.payload.rank || config.rank || "Admin";
            const customRights = msg.payload.adminRights || config.adminRights;

            /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;
            let group, user;

            try {
                group = chatId[0] === "@" ? await client.getEntity(chatId) : parseID(chatId);
                user = userId[0] === "@" ? await client.getEntity(userId) : parseID(userId);

                const adminRights = customRights || new Api.ChatAdminRights({
                    changeInfo: true,
                    postMessages: true,
                    editMessages: true,
                    deleteMessages: true,
                    banUsers: true,
                    inviteUsers: true,
                    pinMessages: true,
                    addAdmins: true,
                    manageCall: true,
                    anonymous: false,
                    manageTopics: true,
                });

                const result = await client.invoke(new Api.channels.EditAdmin({
                    channel: group,
                    userId: user,
                    adminRights,
                    rank,
                }));

                node.send({ payload: result });

            } catch (err) {
                node.error('Error promoting admin: ' + err.message);
            }
        });
    }

    RED.nodes.registerType('promote-admin', PromoteAdmin);
};