'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const axios = require('axios')
const proxyquire = require('proxyquire')

const Endpoints = require('@mojaloop/central-services-shared').Util.Endpoints
const Config = require('../../src/lib/config')
const Notification = require('../../src/handlers/notification')
const { createRequest, unwrapResponse } = require('../helpers')

Test('endpointcache handler', (handlerTest) => {
  let sandbox
  let endpointcacheHandler

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(axios, 'get')
    endpointcacheHandler = proxyquire('../../src/api/handlers/endpointcache', {})
    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()
    Config.HANDLERS_DISABLED = false
    t.end()
  })

  handlerTest.test('/endpointcache should', endpointcacheTest => {
    endpointcacheTest.test('return the correct response when the endpointcache check is up', async test => {
      Notification.isConnected.resolves(true)
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 202
      // TODO: initializeCache call explicitly here as it is NOT being called as part of Base.setup(), replace with proper mock
      await Endpoints.initializeCache(Config.ENDPOINT_CACHE_CONFIG)
      const {
        responseCode
      } = await unwrapResponse((reply) => endpointcacheHandler.delete(createRequest({}), reply))

      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    endpointcacheTest.end()
  })

  handlerTest.end()
})
