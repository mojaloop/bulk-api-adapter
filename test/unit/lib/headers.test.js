/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Mojaloop Foundation
 - Name Surname <name.surname@mojaloop.io>

 * Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const Uuid = require('uuid4')
const ENUM = require('@mojaloop/central-services-shared').Enum
const createCallbackHeaders = require('../../../src/lib/headers').createCallbackHeaders

Test('Headers Test', headersTest => {
  let sandbox

  headersTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    test.end()
  })

  headersTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  headersTest.test('createCallbackHeaders should', createCallbackHeadersTest => {
    createCallbackHeadersTest.test('return correct headers for BULK_TRANSFERS_POST endpoint template', test => {
      const id = Uuid()
      const payerFsp = 'payerfsp'
      const params = {
        headers: { 'fspiop-source': payerFsp },
        dfspId: payerFsp,
        transferId: id,
        httpMethod: ENUM.Http.RestMethods.POST,
        endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_POST
      }
      const expected = {
        'fspiop-source': payerFsp,
        'fspiop-http-method': ENUM.Http.RestMethods.POST,
        'fspiop-uri': '/bulkTransfers'
      }
      const actual = createCallbackHeaders(params)
      test.deepEqual(actual, expected)
      test.end()
    })

    createCallbackHeadersTest.test('return correct headers for BULK_TRANSFERS_PUT endpoint template', test => {
      const id = Uuid()
      const payerFsp = 'payerfsp'
      const params = {
        headers: { 'fspiop-source': payerFsp },
        dfspId: payerFsp,
        transferId: id,
        httpMethod: ENUM.Http.RestMethods.PUT,
        endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT
      }
      const expected = {
        'fspiop-source': payerFsp,
        'fspiop-http-method': ENUM.Http.RestMethods.PUT,
        'fspiop-uri': `/${payerFsp}/bulkTransfers/${id}`
      }
      const actual = createCallbackHeaders(params)
      test.deepEqual(actual, expected)
      test.end()
    })

    createCallbackHeadersTest.test('return correct headers for BULK_TRANSFERS_PUT_ERROR endpoint template', test => {
      const id = Uuid()
      const payerFsp = 'payerfsp'
      const params = {
        headers: { 'fspiop-source': payerFsp },
        dfspId: payerFsp,
        transferId: id,
        httpMethod: ENUM.Http.RestMethods.PUT,
        endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR
      }
      const expected = {
        'fspiop-source': payerFsp,
        'fspiop-http-method': ENUM.Http.RestMethods.PUT,
        'fspiop-uri': `/${payerFsp}/bulkTransfers/${id}/error`
      }
      const actual = createCallbackHeaders(params)
      test.deepEqual(actual, expected)
      test.end()
    })

    createCallbackHeadersTest.end()
  })
  headersTest.end()
})
