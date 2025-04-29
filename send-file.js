module.exports = function (RED) {
    function SendFile(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        var node = this;

        this.on('input', async function (msg) {
            const chatId = msg.payload.chatId || config.chatId;
            const files = msg.payload.files || config.files.split(',').map(file => file.trim());
            const caption = msg.payload.caption || config.caption;
            const forceDocument = msg.payload.forceDocument || config.forceDocument;
            const fileSize = msg.payload.fileSize || config.fileSize;
            const clearDraft = msg.payload.clearDraft || config.clearDraft;
            const progressCallback = msg.payload.progressCallback || config.progressCallback;
            const replyTo = msg.payload.replyTo || config.replyTo;
            const attributes = msg.payload.attributes || config.attributes;
            const thumb = msg.payload.thumb || config.thumb;
            const voiceNote = msg.payload.voiceNote || config.voiceNote;
            const videoNote = msg.payload.videoNote || config.videoNote;
            const supportsStreaming = msg.payload.supportsStreaming || config.supportsStreaming;
            const parseMode = msg.payload.parseMode || config.parseMode;
            const formattingEntities = msg.payload.formattingEntities || config.formattingEntities;
            const silent = msg.payload.silent || config.silent;
            const scheduleDate = msg.payload.scheduleDate || config.scheduleDate;
            const buttons = msg.payload.buttons || config.buttons;
            const workers = msg.payload.workers || config.workers;
            const noforwards = msg.payload.noforwards || config.noforwards;
            const commentTo = msg.payload.commentTo || config.commentTo;
            const topMsgId = msg.payload.topMsgId || config.topMsgId;

             /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;

            try {
                const params = {
                    file: files,
                    caption: caption,
                    forceDocument: forceDocument,
                    fileSize: fileSize,
                    clearDraft: clearDraft,
                    progressCallback: progressCallback,
                    replyTo: replyTo,
                    attributes: attributes,
                    thumb: thumb,
                    voiceNote: voiceNote,
                    videoNote: videoNote,
                    supportsStreaming: supportsStreaming,
                    parseMode: parseMode,
                    formattingEntities: formattingEntities,
                    silent: silent,
                    scheduleDate: scheduleDate,
                    buttons: buttons,
                    workers: workers,
                    noforwards: noforwards,
                    commentTo: commentTo,
                    topMsgId: topMsgId,
                };
                
                
                // Отправка файлов
                const response = await client.sendFile(chatId, params);
                node.send({
                    payload: response,
                });
            } catch (err) {
                node.error('Error sending files: ' + err.message);
            }
        });
    }

    RED.nodes.registerType('send-files', SendFile);
};
