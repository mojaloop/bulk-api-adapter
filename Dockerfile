FROM node:10.15.3-alpine
USER root

WORKDIR /opt/bulk-api-adapter

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake \
    && cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp

COPY package.json package-lock.json* /opt/bulk-api-adapter/
RUN npm install --production && \
  npm uninstall -g npm

RUN apk del build-dependencies

COPY src /opt/bulk-api-adapter/src
COPY config /opt/bulk-api-adapter/config

EXPOSE 3000
CMD ["node src/api/index.js"]
