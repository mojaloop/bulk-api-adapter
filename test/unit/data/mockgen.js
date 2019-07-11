'use strict'
const Swagmock = require('swagmock')
const Path = require('path')
let apiPath = Path.resolve(__dirname, '../../../src/interface/swagger.yaml')
let mockgen

module.exports = function () {
  /**
     * Cached mock generator
     */
  mockgen = mockgen || Swagmock(apiPath)
  return mockgen
}
