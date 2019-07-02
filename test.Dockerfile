FROM node:10.15.3-alpine
USER root

WORKDIR /opt/bulk-api-adapter

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python libtool autoconf automake && \
    cd $(npm root -g)/npm \
    && npm config set unsafe-perm true \
    && npm install -g node-gyp tape tap-xunit

COPY package.json package-lock.json* /opt/bulk-api-adapter/
RUN npm install

RUN apk del build-dependencies

COPY src /opt/bulk-api-adapter/src
COPY test /opt/bulk-api-adapter/test
COPY config /opt/bulk-api-adapter/config

EXPOSE 3000
CMD ["node /opt/bulk-api-adapter/src/api/index.js"]
