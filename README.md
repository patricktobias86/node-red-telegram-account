# Node-RED nodes to communicate with GramJS

<p align="center">
<img alt="GitHub issues" src="https://img.shields.io/github/issues/patricktobias86/node-red-telegram-account?color=56BEB8" />
<img alt="GitHub forks" src="https://img.shields.io/github/forks/patricktobias86/node-red-telegram-account?color=56BEB8" />
<img alt="GitHub stars" src="https://img.shields.io/github/stars/patricktobias86/node-red-telegram-account?color=56BEB8" />
</p>

```bash
npm i @patricktobias86/node-red-telegram-account
```

## Nodes

- resolve-userid – resolve a Telegram username to its numeric user ID

## Session management

Connections to Telegram are cached by the configuration node. When the flow is
redeployed, the existing session is reused instead of creating a new one.
The client is only disconnected once no nodes reference that session anymore.

