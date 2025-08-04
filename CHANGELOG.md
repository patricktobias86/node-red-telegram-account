# Changelog

All notable changes to this project will be documented in this file.

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

