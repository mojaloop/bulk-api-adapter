# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [14.2.0](https://github.com/mojaloop/bulk-api-adapter/compare/v14.1.1...v14.2.0) (2022-11-11)


### Features

* **mojaloop/2867:** switch as fspiop source ([#90](https://github.com/mojaloop/bulk-api-adapter/issues/90)) ([af5680d](https://github.com/mojaloop/bulk-api-adapter/commit/af5680d9db79ffebc43842f100d1dc261501a9c8))

### [14.1.1](https://github.com/mojaloop/bulk-api-adapter/compare/v14.1.0...v14.1.1) (2022-08-18)


### Bug Fixes

* **mojaloop/#2863:** fix put callback http code ([#89](https://github.com/mojaloop/bulk-api-adapter/issues/89)) ([c6699ad](https://github.com/mojaloop/bulk-api-adapter/commit/c6699ad695e0a4627fd76d4288b9ef6e64cd2130))

## [14.1.0](https://github.com/mojaloop/bulk-api-adapter/compare/v14.0.2...v14.1.0) (2022-08-12)


### Features

* **mojaloop/#2796:** duplicate transaction not getting callback for post /bulkTransfers ([#86](https://github.com/mojaloop/bulk-api-adapter/issues/86)) ([fcc7799](https://github.com/mojaloop/bulk-api-adapter/commit/fcc7799368c54adf54c729627ce1e424cbd2df16)), closes [mojaloop/#2796](https://github.com/mojaloop/project/issues/2796)

### [14.0.2](https://github.com/mojaloop/bulk-api-adapter/compare/v14.0.1...v14.0.2) (2022-08-11)


### Bug Fixes

* remove buiness logic from bulk-api-adapter ([#87](https://github.com/mojaloop/bulk-api-adapter/issues/87)) ([4fac6a8](https://github.com/mojaloop/bulk-api-adapter/commit/4fac6a8662336d1fc911156dff8e5aeadea76d6d))

### [14.0.1](https://github.com/mojaloop/bulk-api-adapter/compare/v14.0.0...v14.0.1) (2022-08-01)


### Bug Fixes

* update bulkPrepare kafka message to use headers ([#83](https://github.com/mojaloop/bulk-api-adapter/issues/83)) ([4c39f3d](https://github.com/mojaloop/bulk-api-adapter/commit/4c39f3dfe9b84d6802e024eca77d35f0f1f2280d))

## [14.0.0](https://github.com/mojaloop/bulk-api-adapter/compare/v13.0.1...v14.0.0) (2022-07-07)


### ⚠ BREAKING CHANGES

* upgrade ci, image, packages, audit (#82)

### Features

* upgrade ci, image, packages, audit ([#82](https://github.com/mojaloop/bulk-api-adapter/issues/82)) ([a7c67bd](https://github.com/mojaloop/bulk-api-adapter/commit/a7c67bdae473f85ff4523a4a450b1634fc3fb784))

### [13.0.1](https://github.com/mojaloop/bulk-api-adapter/compare/v13.0.0...v13.0.1) (2022-03-07)


### Bug Fixes

* core-services support for non-breaking backward api compatibility ([#77](https://github.com/mojaloop/bulk-api-adapter/issues/77)) ([d3275b0](https://github.com/mojaloop/bulk-api-adapter/commit/d3275b0c82b18fb48de3e32e8d2e2c0a2a551aa1)), closes [#2704](https://github.com/mojaloop/bulk-api-adapter/issues/2704)

## [13.0.0](https://github.com/mojaloop/bulk-api-adapter/compare/v12.1.0...v13.0.0) (2022-03-04)


### ⚠ BREAKING CHANGES

* **mojaloop/#2704:** - Config PROTOCOL_VERSIONS.CONTENT has now been modified to support backward compatibility for minor versions (i.e. v1.0 & 1.1) as follows:

> ```
>   "PROTOCOL_VERSIONS": {
>     "CONTENT": "1.1", <-- used when generating messages from the "SWITCH", and validate incoming FSPIOP API requests/callbacks CONTENT-TYPE headers
>     "ACCEPT": {
>       "DEFAULT": "1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks ACCEPT headers
>         "1",
>         "1.0",
>         "1.1"
>       ]
>     }
>   },
> ```
> 
> to be consistent with the ACCEPT structure as follows:
> 
> ```
>   "PROTOCOL_VERSIONS": {
>     "CONTENT": {
>       "DEFAULT": "1.1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks CONTENT-TYPE headers
>         "1.1",
>         "1.0"
>       ]
>     },
>     "ACCEPT": {
>       "DEFAULT": "1", <-- used when generating messages from the "SWITCH"
>       "VALIDATELIST": [ <-- used to validate incoming FSPIOP API requests/callbacks ACCEPT headers
>         "1",
>         "1.0",
>         "1.1"
>       ]
>     }
>   },
> ```

### Features

* **mojaloop/#2704:** core-services support for non-breaking backward api compatibility ([#74](https://github.com/mojaloop/bulk-api-adapter/issues/74)) ([62afc4e](https://github.com/mojaloop/bulk-api-adapter/commit/62afc4e9637599474f8761617b084a3da9ca4398)), closes [mojaloop/#2704](https://github.com/mojaloop/project/issues/2704)

## [12.1.0](https://github.com/mojaloop/bulk-api-adapter/compare/v12.0.2...v12.1.0) (2021-12-14)


### Features

* **mojaloop/#2608:** injected resource versions config for outbound requests ([#70](https://github.com/mojaloop/bulk-api-adapter/issues/70)) ([a2c6a91](https://github.com/mojaloop/bulk-api-adapter/commit/a2c6a918799bb833ede26924b3598ffa954023ff)), closes [mojaloop/#2608](https://github.com/mojaloop/project/issues/2608)

### [12.0.2](https://github.com/mojaloop/bulk-api-adapter/compare/v12.0.1...v12.0.2) (2021-11-22)


### Bug Fixes

* release v13.1.0 ([#69](https://github.com/mojaloop/bulk-api-adapter/issues/69)) ([5464a62](https://github.com/mojaloop/bulk-api-adapter/commit/5464a62348782ae3b75997b1fa8dfd4bcdb10cef)), closes [mojaloop/#2584](https://github.com/mojaloop/project/issues/2584)

### [12.0.1](https://github.com/mojaloop/bulk-api-adapter/compare/v12.0.0...v12.0.1) (2021-11-18)

## [12.0.0](https://github.com/mojaloop/bulk-api-adapter/compare/v11.1.4...v12.0.0) (2021-11-17)


### ⚠ BREAKING CHANGES

* **mojaloop/#2538:** Forcing a major version change for awareness of the config changes. The `LIB_RESOURCE_VERSIONS` env var is now deprecated, and this is now also controlled by the PROTOCOL_VERSIONS config in the default.json. This has been done for consistency between all API services going forward and unifies the config for both inbound and outbound Protocol API validation/transformation features.

### Bug Fixes

* **mojaloop/#2538:** fspiop api version negotiation not handled ([#67](https://github.com/mojaloop/bulk-api-adapter/issues/67)) ([416293a](https://github.com/mojaloop/bulk-api-adapter/commit/416293af3bded50986437a5a91797c65ce2b9c38)), closes [mojaloop/#2538](https://github.com/mojaloop/project/issues/2538)
