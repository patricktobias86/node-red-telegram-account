# Node Overview

The package provides a set of custom Node-RED nodes built around the [TeleProto](https://www.npmjs.com/package/teleproto) library. Each node exposes a small part of the Telegram API, making it easier to build Telegram bots and automation flows.

Below is a short description of each node. For a full list of configuration options see the built‑in help inside Node‑RED or open the corresponding HTML files in the `nodes/` directory.

| Node | Description |
|------|-------------|
| **config** | Configuration node storing API credentials and connection options. Other nodes reference this to share a Telegram client and reuse the session. Connections are tracked in a Map with a reference count so multiple nodes can wait for the same connection. |
| **auth** | Starts an interactive login flow. Produces a `stringSession` (available in both <code>msg.payload.stringSession</code> and <code>msg.stringSession</code>) that can be reused with the `config` node. |
| **receiver** | Emits an output message for every incoming Telegram message using Raw MTProto updates (so channel posts, anonymous admins and service messages are not missed). Can ignore specific user IDs, skip selected message types (e.g. videos or documents), optionally drop media above a configurable size, and optionally ignore edited message updates to prevent duplicate outputs when counters/markup change. Output includes derived `peer`, `sender`, `senderType`, `senderId`, `chatId`, `isSilent`, and `messageTypes`. `chatId` is normalized to the MTProto dialog id (userId for private chats, chatId for legacy groups, channelId for supergroups/channels — not the Bot API `-100...` form). When Debug is enabled, a second output emits debug messages that can be wired to a Node-RED debug node. Event handlers are automatically removed when the node is closed. |
| **command** | Listens for new messages and triggers when a message matches a configured command or regular expression. The event listener is cleaned up on node close to avoid duplicates. |
| **send-message** | Sends text messages or media files to a chat. Supports parse mode, buttons, scheduling, and more. |
| **send-files** | Uploads one or more files to a chat with optional caption, thumbnails and other parameters. |
| **get-entity** | Resolves a username, user ID or t.me URL into a Telegram entity object. |
| **delete-message** | Deletes one or multiple messages from a chat while passing the original input message along with the API response. Can revoke messages for all participants. |
| **iter-dialogs** | Iterates through the user’s dialogs (chats, groups, channels) and outputs the collected list. |
| **iter-messages** | Iterates over messages in a chat with various filtering and pagination options. |
| **promote-admin** | Grants admin rights to a user in a group or channel with configurable permissions. |
| **resolve-userid** | Converts a Telegram username to its numeric user ID. |

All nodes forward any properties on the incoming `msg` outside of `msg.payload` unchanged.

All nodes provide a **Debug** checkbox. When enabled the node will log its input and output messages to aid troubleshooting.
