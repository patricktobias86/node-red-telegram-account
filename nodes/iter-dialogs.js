const { TelegramClient } = require("teleproto");

module.exports = function (RED) {
    function IterDialogs(config) {
        RED.nodes.createNode(this, config);
        this.config = RED.nodes.getNode(config.config);
        this.debugEnabled = config.debug;
        var node = this;

        this.on('input', async function (msg) {
            const debug = node.debugEnabled || msg.debug;
            if (debug) {
                node.log('iter-dialogs input: ' + JSON.stringify(msg));
            }
    
            /** @type {TelegramClient} */
            const client = msg.payload?.client ? msg.payload.client : this.config.client;
            const limit = msg.payload.limit || config.limit;
            const offsetDate = msg.payload.offsetDate || config.offsetDate;
            const offsetId = msg.payload.offsetId || config.offsetId;
            const offsetPeer = msg.payload?.offsetPeer || undefined; 
            const ignorePinned = msg.payload.ignorePinned || config.ignorePinned;
            const ignoreMigrated = msg.payload.ignoreMigrated || config.ignoreMigrated;
            const folder = msg.payload.folder || config.folder;
            const archived = msg.payload.archived || config.archived;
            
            const params = {
             limit: limit !== ""? parseInt(limit) : undefined,
             offsetDate: offsetDate !== "" ? offsetDate:undefined,
             offsetId: offsetId !== "" ? parseInt(offsetId):undefined,
             offsetPeer: offsetPeer,
             ignorePinned: ignorePinned,
             ignoreMigrated: ignoreMigrated,
             folder: folder !== "" ? parseInt(folder):undefined,
             archived: archived,
            }

            if (offsetDate) {
                params.offsetDate = new Date(offsetDate).getTime() / 1000;
            }

            try {
                const dialogs = {};
                for await (const dialog of client.iterDialogs(params)){
                    dialogs[dialog.id] = dialog;
                    console.log(`${dialog.id}: ${dialog.title}`);
                }
                const out = { ...msg, payload: { dialogs } };
                node.send(out);
                if (debug) {
                    node.log('iter-dialogs output: ' + JSON.stringify(out));
                }
            } catch (err) {
                node.error('Error iter dialogs: ' + err.message);
            }

        });
    }

    RED.nodes.registerType('iter-dialogs', IterDialogs);
};
