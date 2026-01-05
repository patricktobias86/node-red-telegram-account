# Changelog

All notable changes to this project will be documented in this file.

## [1.1.17] - 2026-01-05
### Fixed
- Receiver node now listens to Raw MTProto updates and derives sender/chat identity safely so valid messages (channel posts, anonymous admins, service messages, missing fromId) are no longer dropped.

## [1.1.16] - 2025-09-22
### Added
- Receiver node option to ignore configurable message types (such as videos or documents) to prevent oversized uploads.
### Changed
- Receiver node collects detailed media type metadata to power the new filter while keeping debug logging informative.

## [1.1.15] - 2025-09-21
### Added
- Receiver node option to drop updates when media exceeds a configurable size threshold, preventing large downloads.

## [1.1.7] - 2025-07-22
### Added
- Mocha tests for the configuration node ensure sessions are reused correctly.

### Changed
- Session management now tracks active clients in a `Map` for safer reuse.

## [1.1.8] - 2025-07-22
### Fixed
- Receiver and Command nodes now remove their event listeners when closed to prevent duplicate messages after redeploys.

## [1.1.10] - 2025-07-27
### Fixed
- Receiver node no longer fails when Debug is enabled and handles updates containing `BigInt` values.
### Changed
- `delete-message` now forwards the original message along with the Telegram API response.

## [1.1.11] - 2025-08-04
### Fixed
- All nodes now preserve properties on the incoming message outside of the payload.

## [1.1.12] - 2025-08-06
### Fixed
- Auth node now emits the generated `stringSession` so it can be used by other nodes.
