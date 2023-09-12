# bulk-api-adapter
[![Git Commit](https://img.shields.io/github/last-commit/mojaloop/bulk-api-adapter.svg?style=flat)](https://github.com/mojaloop/bulk-api-adapter/commits/main)
[![Git Releases](https://img.shields.io/github/release/mojaloop/bulk-api-adapter.svg?style=flat)](https://github.com/mojaloop/bulk-api-adapter/releases)
[![Docker pulls](https://img.shields.io/docker/pulls/mojaloop/bulk-api-adapter.svg?style=flat)](https://hub.docker.com/r/mojaloop/bulk-api-adapter)
[![CircleCI](https://circleci.com/gh/mojaloop/bulk-api-adapter.svg?style=svg)](https://app.circleci.com/pipelines/github/mojaloop/bulk-api-adapter)

Bulk Transfers API and notifications.

## API Definition

Swagger API [location](./src/interface/swagger.yaml)

## Auditing Dependencies

We use `audit-ci` along with `npm audit` to check dependencies for node vulnerabilities, and keep track of resolved dependencies with an `audit-ci.jsonc` file.

To start a new resolution process, run:

```bash
npm run audit:fix
```

You can then check to see if the CI will pass based on the current dependencies with:

```bash
npm run audit:check
```

The [audit-ci.jsonc](./audit-ci.jsonc) contains any audit-exceptions that cannot be fixed to ensure that CircleCI will build correctly.

## Container Scans

As part of our CI/CD process, we use anchore-cli to scan our built docker container for vulnerabilities upon release.

If you find your release builds are failing, refer to the [container scanning](https://github.com/mojaloop/ci-config#container-scanning) in our shared Mojaloop CI config repo. There is a good chance you simply need to update the `mojaloop-policy-generator.js` file and re-run the circleci workflow.

For more information on anchore and anchore-cli, refer to:
- [Anchore CLI](https://github.com/anchore/anchore-cli)
- [Circle Orb Registry](https://circleci.com/orbs/registry/orb/anchore/anchore-engine)

