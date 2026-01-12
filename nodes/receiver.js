const { Raw } = require("telegram/events");
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

const getClassName = (value) => {
    if (!value || typeof value !== 'object') {
        return undefined;
    }
    return value.className || value._;
};

const toPeerInfo = (peer) => {
    if (!peer || typeof peer !== 'object') {
        return null;
    }

    const className = getClassName(peer);
    const userId = peer.userId ?? peer.user_id;
    const chatId = peer.chatId ?? peer.chat_id;
    const channelId = peer.channelId ?? peer.channel_id;

    // GramJS TL objects represent peers as PeerUser / PeerChat / PeerChannel.
    // MTProto updates can omit fromId (anonymous admins, channel posts, etc.), so
    // we normalize peer identity from whichever peer object we have.
    if (userId != null) {
        return { type: 'user', userId, chatId: null, channelId: null, peer };
    }
    if (chatId != null) {
        return { type: 'chat', userId: null, chatId, channelId: null, peer };
    }
    if (channelId != null) {
        return { type: 'channel', userId: null, chatId: null, channelId, peer };
    }

    if (className) {
        return { type: className, userId: null, chatId: null, channelId: null, peer };
    }
    return { type: 'unknown', userId: null, chatId: null, channelId: null, peer };
};

const toSafeNumber = (value) => {
    if (value && typeof value === 'object') {
        // GramJS can represent large integers using custom Integer wrappers.
        // Those often serialize/log as `Integer { value: 123n }`.
        if ('value' in value) {
            return toSafeNumber(value.value);
        }
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (/^-?\d+$/.test(trimmed)) {
            try {
                return toSafeNumber(BigInt(trimmed));
            } catch (err) {
                return null;
            }
        }
        return null;
    }
    if (typeof value === 'bigint') {
        const result = Number(value);
        return Number.isFinite(result) ? result : Number.MAX_SAFE_INTEGER;
    }
    return null;
};

const peerChatId = (peerInfo) => {
    if (!peerInfo) {
        return null;
    }
    // For Node-RED flows "chatId" typically means "the conversation identifier".
    // For private chats that's the userId; for groups it's chatId; for channels it's channelId.
    if (peerInfo.type === 'user') {
        return toSafeNumber(peerInfo.userId);
    }
    if (peerInfo.type === 'chat') {
        return toSafeNumber(peerInfo.chatId);
    }
    if (peerInfo.type === 'channel') {
        return toSafeNumber(peerInfo.channelId);
    }
    return null;
};

const buildPeerUser = (userId) => ({ className: 'PeerUser', userId });
const buildPeerChat = (chatId) => ({ className: 'PeerChat', chatId });

const toDerivedMessage = (update) => {
    const className = getClassName(update);
    if (className === 'UpdateShortMessage') {
        const userId = update.userId ?? update.user_id;
        return {
            className: 'Message',
            id: update.id,
            date: update.date,
            out: update.out,
            silent: update.silent,
            // In UpdateShortMessage, userId is the peer and also the sender for incoming messages.
            peerId: userId != null ? buildPeerUser(userId) : undefined,
            fromId: userId != null ? buildPeerUser(userId) : undefined,
            message: update.message,
            entities: update.entities,
            fwdFrom: update.fwdFrom,
            viaBotId: update.viaBotId,
            replyTo: update.replyTo,
            ttlPeriod: update.ttlPeriod,
            media: update.media
        };
    }

    if (className === 'UpdateShortChatMessage') {
        const chatId = update.chatId ?? update.chat_id;
        const fromId = update.fromId ?? update.from_id;
        return {
            className: 'Message',
            id: update.id,
            date: update.date,
            out: update.out,
            silent: update.silent,
            peerId: chatId != null ? buildPeerChat(chatId) : undefined,
            fromId: fromId != null ? buildPeerUser(fromId) : undefined,
            message: update.message,
            entities: update.entities,
            fwdFrom: update.fwdFrom,
            viaBotId: update.viaBotId,
            replyTo: update.replyTo,
            ttlPeriod: update.ttlPeriod,
            media: update.media
        };
    }

    if (className === 'UpdateShortSentMessage') {
        // This update doesn't include a peer; it's still a real MTProto message update.
        // We emit it with a best-effort message shape so flows can still react.
        return {
            className: 'Message',
            id: update.id,
            date: update.date,
            out: true,
            silent: update.silent,
            message: update.message,
            entities: update.entities,
            media: update.media
        };
    }

    return null;
};

const extractMessageEvents = (rawUpdate) => {
    // Raw MTProto updates can be nested (Updates / UpdatesCombined / UpdateShort).
    // We must unwrap them here instead of relying on NewMessage(), which can miss
    // valid message updates (e.g. channel posts, edits, anonymous admins).
    const results = [];

    const walk = (update) => {
        if (!update || typeof update !== 'object') {
            return;
        }

        const className = getClassName(update);

        if (Array.isArray(update.updates)) {
            for (const nested of update.updates) {
                walk(nested);
            }
            return;
        }

        if (update.update) {
            walk(update.update);
            return;
        }

        // Handle all known message-bearing update types.
        // Standard message updates:
        if (className === 'UpdateNewMessage' ||
            className === 'UpdateNewChannelMessage' ||
            className === 'UpdateEditMessage' ||
            className === 'UpdateEditChannelMessage' ||
            // Scheduled message updates:
            className === 'UpdateNewScheduledMessage' ||
            className === 'UpdateDeleteScheduledMessages' ||
            // Business account message updates (Telegram Business API):
            className === 'UpdateBotNewBusinessMessage' ||
            className === 'UpdateBotEditBusinessMessage' ||
            className === 'UpdateBotDeleteBusinessMessage' ||
            // Quick reply message updates:
            className === 'UpdateQuickReplyMessage' ||
            // Read stories (contains message-like content):
            className === 'UpdateReadStories') {
            if (update.message) {
                results.push({ update, message: update.message });
            } else {
                results.push({ update, message: null });
            }
            return;
        }

        const derived = toDerivedMessage(update);
        if (derived) {
            results.push({ update, message: derived });
            return;
        }
    };

    walk(rawUpdate);
    return results;
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

    const includeChats = splitList(config.includeChats || "");
    const excludeChats = splitList(config.excludeChats || "");
    const includeSenders = splitList(config.includeSenders || "");
    const excludeSenders = splitList(config.excludeSenders || "");

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
                    const nestedValue = toSafeNumber(nested);
                    if (nestedValue != null && nestedValue > max) {
                        max = nestedValue;
                    }
                }
            }
            const value = toSafeNumber(size.size ?? size.length ?? size.bytes);
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
            const value = toSafeNumber(media.document.size);
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
            const docSize = document && toSafeNumber(document.size);
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
            const value = toSafeNumber(media.size);
            if (value != null) {
                return value;
            }
        }

        return null;
    };

    const debugLog = (message) => {
        if (node.debugEnabled) {
            node.log(message);
        }
    };

    const debugSend = (payload) => {
        if (!node.debugEnabled) {
            return;
        }
        node.send([null, { payload }]);
    };

    let rawOptions = {};
    if (includeChats.length > 0) rawOptions.chats = includeChats;
    if (excludeChats.length > 0) rawOptions.blacklistChats = excludeChats;
    if (includeSenders.length > 0) rawOptions.senders = includeSenders;
    if (excludeSenders.length > 0) rawOptions.blacklistSenders = excludeSenders;

    const event = new Raw(rawOptions);
    const handler = (rawUpdate) => {
        const debug = node.debugEnabled;
        if (debug) {
            node.log('receiver raw update: ' + util.inspect(rawUpdate, { depth: null }));
            debugSend({ event: 'rawUpdate', rawUpdate });
        }

        const extracted = extractMessageEvents(rawUpdate);
        if (extracted.length === 0) {
            // Raw emits *all* MTProto updates; many are not message-bearing updates (typing, reads, etc.).
            // We do not output those by default, but we also do not silently hide that they occurred.
            debugLog(`receiver ignoring non-message MTProto update: ${getClassName(rawUpdate) || 'unknown'}`);
            debugSend({ event: 'ignored', reason: 'non-message', rawUpdateClassName: getClassName(rawUpdate) || 'unknown' });
            return;
        }

        for (const { update, message } of extracted) {
            if (!message) {
                debugLog(`receiver ignoring message update without message payload: ${getClassName(update) || 'unknown'}`);
                debugSend({ event: 'ignored', reason: 'missing-message', updateClassName: getClassName(update) || 'unknown' });
                continue;
            }

            const messageTypes = collectMessageTypes(message);
            const isSilent = Boolean(message.silent || update.silent);

            const peer = toPeerInfo(message.peerId || message.toId);

            // Do NOT assume message.fromId.userId exists.
            // fromId can be PeerUser / PeerChat / PeerChannel, can be missing (channel posts),
            // and can represent anonymous admins. Prefer fromId when present; otherwise fall back
            // to the chat peer for channel posts to avoid dropping valid messages.
            const sender =
                toPeerInfo(message.fromId) ||
                (message.senderId != null ? toPeerInfo(buildPeerUser(message.senderId)) : null) ||
                (message.post ? peer : null);

            const senderType = sender ? sender.type : 'unknown';
            const senderId =
                senderType === 'user' ? toSafeNumber(sender.userId) :
                senderType === 'chat' ? toSafeNumber(sender.chatId) :
                senderType === 'channel' ? toSafeNumber(sender.channelId) :
                null;

            const chatId = peerChatId(peer);

            if (ignoredMessageTypes.size > 0) {
                const shouldIgnoreType = Array.from(messageTypes).some((type) => ignoredMessageTypes.has(type));
                if (shouldIgnoreType) {
                    debugLog(`receiver ignoring message due to ignoreMessageTypes; types=${Array.from(messageTypes).join(', ')}`);
                    debugSend({ event: 'ignored', reason: 'ignoreMessageTypes', messageTypes: Array.from(messageTypes) });
                    continue;
                }
            }

            if (maxFileSizeBytes != null) {
                const mediaSize = extractMediaSize(message.media);
                if (mediaSize != null && mediaSize > maxFileSizeBytes) {
                    debugLog(`receiver ignoring message due to maxFileSizeMb; mediaSize=${mediaSize} limitBytes=${maxFileSizeBytes}`);
                    debugSend({ event: 'ignored', reason: 'maxFileSizeMb', mediaSize, limitBytes: maxFileSizeBytes });
                    continue;
                }
            }

            // Preserve existing behavior: ignore list is a list of user IDs.
            // Previously the node assumed message.fromId.userId always existed, which dropped valid updates.
            // Now we only apply the ignore list when we can confidently identify a user sender.
            if (senderType === 'user' && senderId != null && ignore.includes(String(senderId))) {
                debugLog(`receiver ignoring message due to ignore list; userId=${senderId}`);
                debugSend({ event: 'ignored', reason: 'ignore', userId: senderId });
                continue;
            }

            const out = {
                payload: {
                    update,
                    message,
                    peer,
                    sender,
                    senderType,
                    senderId,
                    chatId,
                    isSilent,
                    messageTypes: Array.from(messageTypes)
                }
            };

            if (debug) {
                node.send([out, { payload: { event: 'output', out } }]);
            } else {
                node.send(out);
            }
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
