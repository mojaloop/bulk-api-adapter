'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const axios = require('axios')
const proxyquire = require('proxyquire')

const Config = require('../../src/lib/config')
const Notification = require('../../src/handlers/notification')
const { createRequest, unwrapResponse } = require('../helpers')

Test('health handler', (handlerTest) => {
  let sandbox
  let healthHandler

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Notification, 'isConnected')
    sandbox.stub(axios, 'get')
    healthHandler = proxyquire('../../src/api/handlers/health', {})
    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()
    Config.HANDLERS_DISABLED = false
    t.end()
  })

  handlerTest.test('/health should', healthTest => {
    healthTest.test('returns the correct response when the health check is up', async test => {
      Notification.isConnected.resolves(true)
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 200
      const {
        responseCode
      } = await unwrapResponse((reply) => healthHandler.get(createRequest({}), reply))

      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('returns the correct response when the health check is up in API mode only (Config.HANDLERS_DISABLED=true)', async test => {
      Notification.isConnected.resolves(true)

      Config.HANDLERS_DISABLED = true
      healthHandler = proxyquire('../../src/api/handlers/health', {})
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 200
      const {
        responseCode
      } = await unwrapResponse((reply) => healthHandler.get(createRequest({}), reply))

      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.test('returns the correct response when the health check is down', async test => {
      healthHandler = proxyquire('../../src/api/handlers/health', {})
      Notification.isConnected.throws(new Error('Error connecting to consumer'))
      axios.get.resolves({ data: { status: 'OK' } })
      const expectedResponseCode = 502
      const {
        responseCode
      } = await unwrapResponse((reply) => healthHandler.get(createRequest({ query: { detailed: true } }), reply))

      test.deepEqual(responseCode, expectedResponseCode, 'The response code matches')
      test.end()
    })

    healthTest.end()
  })

  handlerTest.end()
})
