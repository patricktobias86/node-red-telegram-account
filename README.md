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
- **receiver** – emits messages for every incoming update (with optional ignore list). Event listeners are cleaned up on node close so redeploys won't duplicate messages.
- **command** – triggers when an incoming message matches a command or regex. Event listeners are removed on redeploy to prevent duplicates.
- **send-message** – sends text or media messages with rich options.
- **send-files** – uploads one or more files with captions and buttons.
- **get-entity** – resolves usernames, IDs or t.me links into Telegram entities.
- **delete-message** – deletes one or more messages, optionally revoking them.
- **iter-dialogs** – iterates over your dialogs (chats, groups, channels).
- **iter-messages** – iterates over messages in a chat with filtering options.
- **promote-admin** – promotes a user to admin with configurable rights.
- **resolve-userid** – converts a username to a numeric user ID.

All nodes include a <code>Debug</code> option that logs incoming and outgoing messages to the Node-RED log when enabled.

## Session management

Connections to Telegram are cached by the configuration node. A Map keyed by the `stringSession` tracks each client together with a reference count and the connection promise. If a node is created while another one is still connecting, it waits for that promise and then reuses the same client.

A single `TelegramClient` instance is therefore shared between all flows that point to the same configuration node, even after a redeploy. When Node‑RED restarts it checks the cache and returns the existing client rather than creating a new connection. The reference count is decreased whenever a node using the session is closed. Once all nodes have closed and the count reaches zero, the cached client is disconnected.

Example flows can be found in the [examples](examples) folder.

## Running tests

After cloning the repository, install dependencies and run the test suite with:

```bash
npm install
npm test
```

The tests use Mocha and verify that sessions are properly cached across nodes.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release notes.
