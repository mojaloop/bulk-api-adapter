const Setup = require('../shared/setup')
const Config = require('../../src/lib/config')

module.exports = Setup.initialize({
  service: 'api',
  port: Config.PORT,
  runHandlers: !Config.HANDLERS_DISABLED
})
