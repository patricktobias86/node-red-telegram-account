# Node Overview

The package provides a set of custom Node-RED nodes built around the [GramJS](https://gram.js.org/) library. Each node exposes a small part of the Telegram API, making it easier to build Telegram bots and automation flows.

Below is a short description of each node. For a full list of configuration options see the built‑in help inside Node‑RED or open the corresponding HTML files in the `nodes/` directory.

| Node | Description |
|------|-------------|
| **config** | Configuration node storing API credentials and connection options. Other nodes reference this to share a Telegram client and reuse the session. |
| **auth** | Starts an interactive login flow. Produces a `stringSession` that can be reused with the `config` node. |
| **receiver** | Emits an output message for every incoming Telegram message. Can ignore specific user IDs. |
| **command** | Listens for new messages and triggers when a message matches a configured command or regular expression. |
| **send-message** | Sends text messages or media files to a chat. Supports parse mode, buttons, scheduling, and more. |
| **send-files** | Uploads one or more files to a chat with optional caption, thumbnails and other parameters. |
| **get-entity** | Resolves a username, user ID or t.me URL into a Telegram entity object. |
| **delete-message** | Deletes one or multiple messages from a chat. Can revoke messages for all participants. |
| **iter-dialogs** | Iterates through the user’s dialogs (chats, groups, channels) and outputs the collected list. |
| **iter-messages** | Iterates over messages in a chat with various filtering and pagination options. |
| **promote-admin** | Grants admin rights to a user in a group or channel with configurable permissions. |
| **resolve-userid** | Converts a Telegram username to its numeric user ID. |


