const { TelegramClient } = require("telegram");
const { parseID } = require("telegram/Utils");
const { Api } = require("telegram");

module.exports = function (RED) {
    function PromoteAdmin(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function (msg) {
            const client = msg.payload?.client || this.config.client;

            const chatId = msg.payload.chatId || config.chatId;
            const userId = msg.payload.userId || config.userId;
            const rank = msg.payload.rank || config.rank || "Admin";

            try {
                const group = chatId[0] === "@" ? await client.getEntity(chatId) : parseID(chatId);
                const user = userId[0] === "@" ? await client.getEntity(userId) : parseID(userId);

                const adminRights = new Api.ChatAdminRights({
                    changeInfo: msg.payload.changeInfo ?? config.changeInfo,
                    postMessages: msg.payload.postMessages ?? config.postMessages,
                    editMessages: msg.payload.editMessages ?? config.editMessages,
                    deleteMessages: msg.payload.deleteMessages ?? config.deleteMessages,
                    banUsers: msg.payload.banUsers ?? config.banUsers,
                    inviteUsers: msg.payload.inviteUsers ?? config.inviteUsers,
                    pinMessages: msg.payload.pinMessages ?? config.pinMessages,
                    addAdmins: msg.payload.addAdmins ?? config.addAdmins,
                    manageCall: msg.payload.manageCall ?? config.manageCall,
                    anonymous: msg.payload.anonymous ?? config.anonymous,
                    manageTopics: msg.payload.manageTopics ?? config.manageTopics,
                });

                const result = await client.invoke(new Api.channels.EditAdmin({
                    channel: group,
                    userId: user,
                    adminRights: adminRights,
                    rank: rank,
                }));

                node.send({ payload: { response: result } });
            } catch (err) {
                node.error("Error promoting admin: " + err.message);
            }
        });
    }

    RED.nodes.registerType("promote-admin", PromoteAdmin);
};