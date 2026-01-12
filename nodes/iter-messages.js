const { TelegramClient, utils, Api } = require("teleproto");

module.exports = function (RED) {
    function IterMessages(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        this.debugEnabled = config.debug;
        var node = this;

        this.on('input', async function (msg) {
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('iter-messages input: ' + JSON.stringify(msg));
            }
    
            /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;
            const chatId = msg.payload?.chatId ? msg.payload.chatId : config.chatId;
            let peerId = chatId === "me" ? chatId : utils.parseID(chatId);

            // Получаем параметры из входного сообщения или из конфигурации узла
            const limit = msg.payload?.limit || config.limit;
            const offsetDate = msg.payload?.offsetDate || config.offsetDate;
            const offsetId = msg.payload?.offsetId || config.offsetId;
            const maxId = msg.payload?.maxId || config.maxId;
            const minId = msg.payload?.minId || config.minId;
            const addOffset = msg.payload?.addOffset || config.addOffset;
            const search = msg.payload?.search || config.search;
            const filter = msg.payload?.filter || config.filter;
            const fromUser = msg.payload?.fromUser || config.fromUser;
            const waitTime = msg.payload?.waitTime || config.waitTime;
            const messageIds = msg.payload?.messageIds || config.messageIds;
            const reverse = msg.payload?.reverse || config.reverse;
            const replyTo = msg.payload?.replyTo || config.replyTo;
            const scheduled = msg.payload?.scheduled || config.scheduled;

            try {
                
                const params = {
                    limit: limit !== ""? parseInt(limit) : undefined,
                    offsetDate: offsetDate !== "" ? offsetDate:undefined,
                    offsetId: offsetId !== "" ? parseInt(offsetId):undefined,
                    maxId: maxId,
                    minId: minId,
                    addOffset: addOffset,
                    search: search !== "" ? search : undefined,
                    filter: filter,
                    // fromUser: fromUser,
                    waitTime: waitTime,
                    ids: messageIds,
                    reverse: reverse,
                    replyTo: replyTo,
                    scheduled: scheduled,
                };

                if (offsetDate) {
                    params.offsetDate = new Date(offsetDate).getTime() / 1000;
                }

                if (chatId[0] === "@") { 
                    peerId = await client.getEntity(chatId);
                }
                const messages = {};

                const filters = msg.payload?.filters || config.filters || [];

                  // Обработка выбранных фильтров
                  if (filters.length > 0) {
                    params.filter = [];
                    filters.forEach((filter) => {
                        params.filter.push( Api[filter]);
                    });
                }

                try {
                    for await (const message of client.iterMessages(peerId, params)){
                        messages[message.id] = message;
                        console.log(message.id, message.text);
                    }
                } catch (error) {
                    const entity = await client.getInputEntity(peerId)
                    for await (const message of client.iterMessages(entity, params)){
                        messages[message.id] = message;
                        console.log(message.id, message.text);
                    }
                }

                const out = { ...msg, payload: { messages } };
                node.send(out);
                if (debug) {
                    node.log('iter-messages output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error iter messages: ' + err.message);
            }

        });
    }

    RED.nodes.registerType('iter-messages', IterMessages);
};
