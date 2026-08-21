# Arguments
ARG NODE_VERSION="24.18.0-alpine3.24"
# NOTE: Ensure you set NODE_VERSION Build Argument as follows...
#
#  export NODE_VERSION="$(cat .nvmrc)-alpine" \
#  docker build \
#    --build-arg NODE_VERSION=$NODE_VERSION \
#    -t mojaloop/sdk-scheme-adapter:local \
#    . \
#

# Build Image
FROM node:${NODE_VERSION} as builder

USER root

WORKDIR /opt/app/

RUN apk add --no-cache -t build-dependencies git make gcc g++ python3 py3-setuptools libtool autoconf automake bash \
    && cd $(npm root -g)/npm

COPY package.json package-lock.json* /opt/app/
# Lifecycle scripts are skipped for supply-chain safety (docker:S6505); node-rdkafka
# is the only production dependency that needs its native build, so run it explicitly.
# Dev dependencies are omitted here rather than pruned from the runtime image: `npm prune`
# re-extracts node-rdkafka and would throw away the native build made just above.
RUN npm ci --omit=dev --ignore-scripts
RUN npm rebuild node-rdkafka

COPY src /opt/app/src
COPY config /opt/app/config

FROM node:${NODE_VERSION}
WORKDIR /opt/app/

# Create empty log file & link stdout to the application log file
RUN mkdir ./logs && touch ./logs/combined.log
RUN ln -sf /dev/stdout ./logs/combined.log

# Create a non-root user: app-user
RUN adduser -D app-user

COPY --chown=app-user --from=builder /opt/app/ .

# Remove npm/npx from runtime image to eliminate npm's vulnerable tar - failing grype scan
USER root
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm /usr/local/bin/npx
RUN rm -rf \
/opt/app/node_modules/@redocly/openapi-core/node_modules/minimatch \
/opt/app/node_modules/filelist/node_modules/minimatch
RUN node -e "require('./src/api/index.js'); console.log('startup ok')"    

USER app-user

EXPOSE 3000
CMD ["node", "src/api/index.js"]
