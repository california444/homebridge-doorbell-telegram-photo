## [3.0.0](https://github.com/california444/homebridge-doorbell-telegram-photo/compare/v2.0.1...v3.0.0) (2026-09-08)

### ⚠ BREAKING CHANGES

* homebridge 1.x and Node 20 are no longer supported.
The plugin now requires homebridge 2.0.0 or later on Node 22, 24 or 26.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>

### Features

* **release:** publish every merged PR to npm ([e6cd0f4](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/e6cd0f443c3baaaff19cf2ae83cefd97ef3b8c1f))
* require homebridge 2 and node 22+ ([3b1baf9](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/3b1baf92673e27e649e672ec259e2804170d711c))

## [2.0.1](https://github.com/california444/homebridge-doorbell-telegram-photo/compare/v2.0.0...v2.0.1) (2026-09-08)

### Bug Fixes

* **deps:** resolve all reported audit vulnerabilities ([159eb49](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/159eb494f9cd3ac9613d63f0d9ff0d3bd3f0d5c4))

## [2.0.0](https://github.com/california444/homebridge-doorbell-telegram-photo/compare/v1.2.0...v2.0.0) (2026-09-02)

### ⚠ BREAKING CHANGES

* **deps:** migrate to node-telegram-bot-api v2

### Features

* **deps:** migrate to node-telegram-bot-api v2 ([29a94e6](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/29a94e69db2a935835ad50f242935aab0e0e10b9)), closes [#416](https://github.com/california444/homebridge-doorbell-telegram-photo/issues/416)

## [1.2.0](https://github.com/california444/homebridge-doorbell-telegram-photo/compare/v1.1.4...v1.2.0) (2026-02-28)

### Features

* add dotenv support and update tests configuration ([3af24e3](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/3af24e3109f0d1cd1808c0cc75eec8e402754c81))
* replace axios with digest-fetch for improved authentication handling ([8c641e6](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/8c641e6db3ad81b8d0057caa26f04e6e816b124a))

### Bug Fixes

* correct branch filter in build workflow to include main branch ([98a838f](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/98a838f95c57ec80f1d98dd613bfe92aa8a120e7))
* improve snapshot expiry handling and update path import in jest setup ([25e38e6](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/25e38e6ce7025940861865c786129a92f62ba6ca))
* refactor fetchWithAuth function for improved error handling and readability ([4358f83](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/4358f831e1f9b4cb87d48b5c018b5488ee10f4e9))
* update Node Build badge link in README ([6750c4b](https://github.com/california444/homebridge-doorbell-telegram-photo/commit/6750c4b5bccfec1afe06b9d8677a7a8db09a1805))
