const { NewMessage } = require("telegram/events");
const util = require("util");

module.exports = function (RED) {
  function Receiver(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    this.debugEnabled = config.debug;
    var node = this;
    const client =  this.config.client;
    const ignore = (config.ignore || "")
        .split(/\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);
    const maxFileSizeMb = Number(config.maxFileSizeMb);
    const maxFileSizeBytes = Number.isFinite(maxFileSizeMb) && maxFileSizeMb > 0
        ? maxFileSizeMb * 1024 * 1024
        : null;

    const toNumber = (value) => {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'bigint') {
            const result = Number(value);
            return Number.isFinite(result) ? result : Number.MAX_SAFE_INTEGER;
        }
        return undefined;
    };

    const extractPhotoSize = (photo) => {
        if (!photo || !Array.isArray(photo.sizes)) {
            return null;
        }
        let max = 0;
        for (const size of photo.sizes) {
            if (size == null) {
                continue;
            }
            if (Array.isArray(size.sizes)) {
                for (const nested of size.sizes) {
                    const nestedValue = toNumber(nested);
                    if (nestedValue != null && nestedValue > max) {
                        max = nestedValue;
                    }
                }
            }
            const value = toNumber(size.size ?? size.length ?? size.bytes);
            if (value != null && value > max) {
                max = value;
            }
        }
        return max > 0 ? max : null;
    };

    const extractMediaSize = (media) => {
        if (!media) {
            return null;
        }

        if (media.document && media.document.size != null) {
            const value = toNumber(media.document.size);
            if (value != null) {
                return value;
            }
        }

        if (media.photo) {
            const photoSize = extractPhotoSize(media.photo);
            if (photoSize != null) {
                return photoSize;
            }
        }

        if (media.webpage) {
            const { document, photo } = media.webpage;
            const docSize = document && toNumber(document.size);
            if (docSize != null) {
                return docSize;
            }
            const photoSize = extractPhotoSize(photo);
            if (photoSize != null) {
                return photoSize;
            }
        }

        const className = media.className || media._;
        if ((className === 'MessageMediaDocument' || className === 'MessageMediaPhoto') && media.size != null) {
            const value = toNumber(media.size);
            if (value != null) {
                return value;
            }
        }

        return null;
    };

    const event = new NewMessage();
    const handler = (update) => {
        const debug = node.debugEnabled;
        if (debug) {
            node.log('receiver update: ' + util.inspect(update, { depth: null }));
        }
        const message = update && update.message;
        if (!message) {
            return;
        }

        if (maxFileSizeBytes != null) {
            const mediaSize = extractMediaSize(message.media);
            if (mediaSize != null && mediaSize > maxFileSizeBytes) {
                if (debug) {
                    node.log(`receiver ignoring update with media size ${mediaSize} bytes exceeding limit ${maxFileSizeBytes}`);
                }
                return;
            }
        }

        const senderId = message.fromId && message.fromId.userId;
        if (senderId != null && ignore.includes(senderId.toString())) {
            return;
        }

        if (message.fromId != null && message.fromId.userId != null) {
            const out = { payload: { update } };
            node.send(out);
            if (debug) {
                node.log('receiver output: ' + util.inspect(out, { depth: null }));
            }
        }
    };

    try {
      client.addEventHandler(handler, event);
    } catch (err) {
      node.error('Authorization error: ' + err.message);
    }

    this.on('close', () => {
      try {
        client.removeEventHandler(handler, event);
      } catch (err) {
        node.error('Handler removal error: ' + err.message);
      }
    });

  }

  RED.nodes.registerType('receiver', Receiver);
};
