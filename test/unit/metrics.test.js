'use strict'

const Test = require('tape')
const Hapi = require('@hapi/hapi')
const Path = require('path')
const { OpenapiBackend } = require('@mojaloop/central-services-shared').Util

const Handlers = require('../../src/api/handlers')
const Routes = require('../../src/api/routes')

/**
 * Test for /metrics
 */
Test('/metrics', function (t) {
  /**
     * summary: Prometheus metrics endpoint
     * description:
     * parameters:
     * produces:
     * responses: default
     */
  t.test('test getMetrics get operation', async function (t) {
    const server = new Hapi.Server()

    const api = await OpenapiBackend.initialise(Path.resolve(__dirname, '../../src/interface/swagger.yaml'), Handlers)
    server.route(Routes.APIRoutes(api))

    const response = await server.inject({
      method: 'get',
      url: '/metrics'
    })

    t.equal(response.statusCode, 200, 'Ok response status')
    t.end()
  })
})
