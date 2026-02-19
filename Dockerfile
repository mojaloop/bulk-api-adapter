# Arguments
ARG NODE_VERSION="22.22.0-alpine3.23"
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
RUN npm ci

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
RUN npm prune --production

# Remove npm/npx from runtime image to eliminate npm's vulnerable tar - failing grype scan
USER root
RUN rm -rf /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm /usr/local/bin/npx

USER app-user

EXPOSE 3000
CMD ["node src/api/index.js"]
