# Node-RED nodes to communicate with GramJS

<p align="center">
<img alt="GitHub issues" src="https://img.shields.io/github/issues/patricktobias86/node-red-telegram-account?color=56BEB8" />
<img alt="GitHub forks" src="https://img.shields.io/github/forks/patricktobias86/node-red-telegram-account?color=56BEB8" />
<img alt="GitHub stars" src="https://img.shields.io/github/stars/patricktobias86/node-red-telegram-account?color=56BEB8" />
</p>

```bash
npm i @patricktobias86/node-red-telegram-account
```

This package contains a collection of Node‑RED nodes built on top of [GramJS](https://gram.js.org/). They make it easier to interact with the Telegram MTProto API from your flows.

## Node overview

See [docs/NODES.md](docs/NODES.md) for a detailed description of every node. Below is a quick summary:

- **config** – stores your API credentials and caches sessions for reuse.
- **auth** – interactive login that outputs a `stringSession`.
- **receiver** – emits messages for every incoming update (with optional ignore list).
- **command** – triggers when an incoming message matches a command or regex.
- **send-message** – sends text or media messages with rich options.
- **send-files** – uploads one or more files with captions and buttons.
- **get-entity** – resolves usernames, IDs or t.me links into Telegram entities.
- **delete-message** – deletes one or more messages, optionally revoking them.
- **iter-dialogs** – iterates over your dialogs (chats, groups, channels).
- **iter-messages** – iterates over messages in a chat with filtering options.
- **promote-admin** – promotes a user to admin with configurable rights.
- **resolve-userid** – converts a username to a numeric user ID.

## Session management

Connections to Telegram are cached by the configuration node. When the flow is redeployed, the existing session is reused instead of creating a new one. The client is only disconnected once no nodes reference that session anymore.

Example flows can be found in the [examples](examples) folder.
