# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [12.0.0](https://github.com/mojaloop/bulk-api-adapter/compare/v11.1.4...v12.0.0) (2021-11-17)


### ⚠ BREAKING CHANGES

* **mojaloop/#2538:** Forcing a major version change for awareness of the config changes. The `LIB_RESOURCE_VERSIONS` env var is now deprecated, and this is now also controlled by the PROTOCOL_VERSIONS config in the default.json. This has been done for consistency between all API services going forward and unifies the config for both inbound and outbound Protocol API validation/transformation features.

### Bug Fixes

* **mojaloop/#2538:** fspiop api version negotiation not handled ([#67](https://github.com/mojaloop/bulk-api-adapter/issues/67)) ([416293a](https://github.com/mojaloop/bulk-api-adapter/commit/416293af3bded50986437a5a91797c65ce2b9c38)), closes [mojaloop/#2538](https://github.com/mojaloop/bulk-api-adapter/issues/2538) [mojaloop/#2538](https://github.com/mojaloop/bulk-api-adapter/issues/2538)
