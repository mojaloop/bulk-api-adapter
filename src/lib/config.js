const RC = require('parse-strings-in-object')(require('rc')('BKAPI', require('../../config/default.json')))
const fs = require('fs')

const getFileContent = (path) => {
  if (!fs.existsSync(path)) {
    console.log(`File ${path} doesn't exist, can't enable JWS signing`)
    throw new Error('File doesn\'t exist')
  }
  return fs.readFileSync(path)
}

const DEFAULT_PROTOCOL_VERSION = {
  CONTENT: {
    DEFAULT: '1.1',
    VALIDATELIST: [
      '1.0',
      '1.1'
    ]
  },
  ACCEPT: {
    DEFAULT: '1',
    VALIDATELIST: [
      '1',
      '1.0',
      '1.1'
    ]
  }
}

const getProtocolVersions = (defaultProtocolVersions, overrideProtocolVersions) => {
  const T_PROTOCOL_VERSION = {
    ...defaultProtocolVersions,
    ...overrideProtocolVersions
  }

  if (overrideProtocolVersions && overrideProtocolVersions.CONTENT) {
    T_PROTOCOL_VERSION.CONTENT = {
      ...defaultProtocolVersions.CONTENT,
      ...overrideProtocolVersions.CONTENT
    }
  }
  if (overrideProtocolVersions && overrideProtocolVersions.ACCEPT) {
    T_PROTOCOL_VERSION.ACCEPT = {
      ...defaultProtocolVersions.ACCEPT,
      ...overrideProtocolVersions.ACCEPT
    }
  }

  if (T_PROTOCOL_VERSION.CONTENT &&
    T_PROTOCOL_VERSION.CONTENT.VALIDATELIST &&
    (typeof T_PROTOCOL_VERSION.CONTENT.VALIDATELIST === 'string' ||
      T_PROTOCOL_VERSION.CONTENT.VALIDATELIST instanceof String)) {
    T_PROTOCOL_VERSION.CONTENT.VALIDATELIST = JSON.parse(T_PROTOCOL_VERSION.CONTENT.VALIDATELIST)
  }
  if (T_PROTOCOL_VERSION.ACCEPT &&
    T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST &&
    (typeof T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST === 'string' ||
      T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST instanceof String)) {
    T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST = JSON.parse(T_PROTOCOL_VERSION.ACCEPT.VALIDATELIST)
  }
  return T_PROTOCOL_VERSION
}

// Set config object to be returned
const config = {
  HOSTNAME: RC.HOSTNAME.replace(/\/$/, ''),
  PORT: RC.PORT,
  MONGODB_HOST: RC.MONGODB.HOST,
  MONGODB_PORT: RC.MONGODB.PORT,
  MONGODB_USER: RC.MONGODB.USER,
  MONGODB_PASSWORD: RC.MONGODB.PASSWORD,
  MONGODB_DATABASE: RC.MONGODB.DATABASE,
  AMOUNT: RC.AMOUNT,
  DFSP_URLS: RC.DFSP_URLS,
  HANDLERS: RC.HANDLERS,
  HANDLERS_DISABLED: RC.HANDLERS.DISABLED,
  HANDLERS_API: RC.HANDLERS.API,
  HANDLERS_API_DISABLED: RC.HANDLERS.API.DISABLED,
  KAFKA_CONFIG: RC.KAFKA,
  ENDPOINT_CACHE_CONFIG: RC.ENDPOINT_CACHE_CONFIG,
  ENDPOINT_SOURCE_URL: RC.ENDPOINT_SOURCE_URL,
  ENDPOINT_HEALTH_URL: RC.ENDPOINT_HEALTH_URL,
  INSTRUMENTATION_METRICS_DISABLED: RC.INSTRUMENTATION.METRICS.DISABLED,
  INSTRUMENTATION_METRICS_CONFIG: RC.INSTRUMENTATION.METRICS.config,
  ENDPOINT_SECURITY: RC.ENDPOINT_SECURITY,
  ENDPOINT_SECURITY_TLS: RC.ENDPOINT_SECURITY.TLS,
  MAX_FULFIL_TIMEOUT_DURATION_SECONDS: RC.MAX_FULFIL_TIMEOUT_DURATION_SECONDS,
  JWS_SIGN: RC.ENDPOINT_SECURITY.JWS.JWS_SIGN,
  FSPIOP_SOURCE_TO_SIGN: RC.ENDPOINT_SECURITY.JWS.FSPIOP_SOURCE_TO_SIGN,
  JWS_SIGNING_KEY_PATH: RC.ENDPOINT_SECURITY.JWS.JWS_SIGNING_KEY_PATH,
  PROTOCOL_VERSIONS: getProtocolVersions(DEFAULT_PROTOCOL_VERSION, RC.PROTOCOL_VERSIONS)
}

if (config.JWS_SIGN) {
  config.JWS_SIGNING_KEY = getFileContent(config.JWS_SIGNING_KEY_PATH)
}

module.exports = config
