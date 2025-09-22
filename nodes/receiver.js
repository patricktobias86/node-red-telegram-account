const { NewMessage } = require("telegram/events");
const util = require("util");

const splitList = (value) => {
    if (typeof value !== 'string') {
        return [];
    }
    return value
        .split(/[\n,\r]/)
        .map((entry) => entry.trim())
        .filter(Boolean);
};

const toLowerCaseSet = (values) => {
    const result = new Set();
    for (const value of values) {
        result.add(value.toLowerCase());
    }
    return result;
};

const addType = (target, value) => {
    if (!value) {
        return;
    }
    target.add(String(value).toLowerCase());
};

const collectDocumentTypes = (document, types) => {
    if (!document) {
        return;
    }

    addType(types, 'document');

    if (Array.isArray(document.attributes)) {
        for (const attribute of document.attributes) {
            if (!attribute) {
                continue;
            }
            const attributeName = attribute.className || attribute._;
            addType(types, attributeName);
            switch (attributeName) {
                case 'DocumentAttributeVideo':
                    addType(types, 'video');
                    break;
                case 'DocumentAttributeAudio':
                    addType(types, 'audio');
                    if (attribute.voice) {
                        addType(types, 'voice');
                    }
                    break;
                case 'DocumentAttributeAnimated':
                    addType(types, 'animation');
                    break;
                case 'DocumentAttributeSticker':
                    addType(types, 'sticker');
                    break;
                default:
                    break;
            }
        }
    }

    if (typeof document.mimeType === 'string') {
        const mimeType = document.mimeType.toLowerCase();
        addType(types, mimeType);
        const slashIndex = mimeType.indexOf('/');
        if (slashIndex > 0) {
            addType(types, mimeType.slice(0, slashIndex));
        }
        if (mimeType.startsWith('video/')) {
            addType(types, 'video');
        } else if (mimeType.startsWith('audio/')) {
            addType(types, 'audio');
        } else if (mimeType.startsWith('image/')) {
            addType(types, 'image');
        }
    }
};

const collectMediaTypes = (media, types) => {
    if (!media) {
        return;
    }
    addType(types, 'media');
    addType(types, media.className || media._);

    if (media.document) {
        collectDocumentTypes(media.document, types);
    }
    if (media.photo) {
        addType(types, 'photo');
    }
    if (media.webpage) {
        addType(types, 'webpage');
        if (media.webpage.document) {
            collectDocumentTypes(media.webpage.document, types);
        }
        if (media.webpage.photo) {
            addType(types, 'photo');
        }
    }
    if (media.poll) {
        addType(types, 'poll');
    }
    if (media.contact) {
        addType(types, 'contact');
    }
    if (media.geo || media.geoPoint) {
        addType(types, 'location');
    }
    if (media.venue) {
        addType(types, 'venue');
    }
    if (media.game) {
        addType(types, 'game');
    }
    if (media.sticker) {
        addType(types, 'sticker');
    }
};

const collectMessageTypes = (message) => {
    const types = new Set();
    if (!message || typeof message !== 'object') {
        return types;
    }

    collectMediaTypes(message.media, types);

    if (typeof message.message === 'string' && message.message.length > 0 && !message.media) {
        addType(types, 'text');
    }

    if (message.action) {
        const actionName = message.action.className || message.action._;
        addType(types, actionName);
        if (actionName) {
            addType(types, 'service');
        }
    }

    if (message.ttlPeriod) {
        addType(types, 'self-destructing');
    }

    return types;
};

module.exports = function (RED) {
  function Receiver(config) {
    RED.nodes.createNode(this, config);
    this.config = RED.nodes.getNode(config.config);
    this.debugEnabled = config.debug;
    var node = this;
    const client =  this.config.client;
    const ignore = splitList(config.ignore || "");
    const ignoredMessageTypes = toLowerCaseSet(splitList(config.ignoreMessageTypes || ""));
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

        if (ignoredMessageTypes.size > 0) {
            const messageTypes = collectMessageTypes(message);
            const shouldIgnoreType = Array.from(messageTypes).some((type) => ignoredMessageTypes.has(type));
            if (shouldIgnoreType) {
                if (debug) {
                    node.log(`receiver ignoring update with types: ${Array.from(messageTypes).join(', ')}`);
                }
                return;
            }
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
