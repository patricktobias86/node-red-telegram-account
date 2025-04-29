const { TelegramClient } = require("telegram");
const { parseID } = require("telegram/Utils");

module.exports = function (RED) {
    function SendMessage(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function (msg) {
            let chatId = msg.payload.chatId || config.chatId;
            const message = msg.payload.message || config.message;
            const parseMode = msg.payload.parseMode || config.parseMode;
            const schedule = msg.payload.schedule || config.schedule;
            const replyTo = msg.payload.replyTo || config.replyTo;
            const attributes = msg.payload.attributes || config.attributes;
            const formattingEntities = msg.payload.formattingEntities || config.formattingEntities;
            const linkPreview = msg.payload.linkPreview || config.linkPreview;
            const file = msg.payload.file || config.file;
            const thumb = msg.payload.thumb || config.thumb;
            const forceDocument = msg.payload.forceDocument || config.forceDocument;
            const clearDraft = msg.payload.clearDraft || config.clearDraft;
            const buttons = msg.payload.buttons || config.buttons;
            const silent = msg.payload.silent || config.silent;
            const supportStreaming = msg.payload.supportStreaming || config.supportStreaming;
            const noforwards = msg.payload.noforwards || config.noforwards;
            const commentTo = msg.payload.commentTo || config.commentTo;
            const topMsgId = msg.payload.topMsgId || config.topMsgId;

            /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;
            let peerId = chatId === "me" ? chatId : parseID(chatId);

            try {
                const params = {
                    message: message,
                    parseMode: parseMode,
                    replyTo: replyTo !== ""? replyTo:undefined,
                    attributes: attributes,
                    formattingEntities: formattingEntities !== ""? formattingEntities:undefined,
                    linkPreview: linkPreview,
                    file: file !== "" && file.length > 1? file:undefined,
                    thumb: thumb,
                    forceDocument: forceDocument,
                    clearDraft: clearDraft,
                    buttons: buttons !== "" ? buttons : undefined,
                    silent: silent,
                    supportStreaming: supportStreaming,
                    noforwards: noforwards,
                    commentTo: commentTo !== "" ? commentTo : undefined,
                    topMsgId: topMsgId !== topMsgId ? commentTo : undefined,
                };

                if (schedule) {
                    params.schedule = new Date(schedule).getTime() / 1000;
                }

                let response;
                if (chatId[0] === "@") { 
                    peerId = await client.getEntity(chatId);
                }
                

                try {
                    response = await client.sendMessage(peerId, params);
                } catch (error) {
                    const entity = await client.getInputEntity(peerId)
                    await client.sendMessage(entity, params);
                }

                node.send({
                    payload: { response },
                });
            } catch (err) {
                node.error('Error send message: ' + err.message);
            }

        });

    }

    RED.nodes.registerType('send-message', SendMessage);
};
