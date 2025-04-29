const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

module.exports = function (RED) {
    function TelegramClientConfig(config) {
        RED.nodes.createNode(this, config);
        this.apiId = config.api_id;
        this.apiHash = config.api_hash;
        this.session = new StringSession(config.session);
        this.useIPV6 = config.useIPV6;
        this.timeout = config.timeout;
        this.requestRetries = config.requestRetries;
        this.connectionRetries = config.connectionRetries;
        this.proxy = config.proxy;
        this.downloadRetries = config.downloadRetries;
        this.retryDelay = config.retryDelay;
        this.autoReconnect = config.autoReconnect;
        this.sequentialUpdates = config.sequentialUpdates;
        this.floodSleepThreshold = config.floodSleepThreshold;
        this.deviceModel = config.deviceModel;
        this.systemVersion = config.systemVersion;
        this.appVersion = config.appVersion;
        this.langCode = config.langCode;
        this.systemLangCode = config.systemLangCode;
        this.useWSS = config.useWSS;
        this.maxConcurrentDownloads = config.maxConcurrentDownloads;
        this.securityChecks = config.securityChecks;
        this.testServers = config.testServers;
        const node = this;


        this.client = new TelegramClient(this.session, parseInt(this.apiId), this.apiHash, {
           
           
        });

        try {
            this.client.connect().then(async () => {
                let isAuthorized = await this.client.isUserAuthorized();
                if (!isAuthorized) {
                    node.error(`Session is invalid`);
                } else {
                    node.status({ fill: "green", shape: "dot", text: "Connected" });
                }
            });
        } catch (err) {
            node.error('Authorisation error: ' + err.message);
        }

        this.on("close", () => {
            if (this.client) {
                this.client.disconnect();
                node.status({ fill: "red", shape: "ring", text: "Disconnected" });
            }
        });
    }
    RED.nodes.registerType('config', TelegramClientConfig);
};
