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

 * ModusBox
 - Steven Oderayi <steven.oderayi@modusbox.com>
 --------------
 ******/

'use strict'

const Test = require('tapes')(require('tape'))
const Sinon = require('sinon')
const ENUM = require('@mojaloop/central-services-shared').Enum
const FSPIOPError = require('@mojaloop/central-services-error-handling').Factory.FSPIOPError
const Logger = require('@mojaloop/central-services-logger')
const Handler = require('../../../../../../src/api/handlers/bulkTransfers/{id}/error')
const TransferService = require('../../../../../../src/domain/bulkTransfer')
const BulkTransferModels = require('@mojaloop/object-store-lib').Models.BulkTransfer

const createPutRequest = (params, payload) => {
  const requestPayload = payload || {}
  const requestParams = params || {}
  const headers = {}
  headers[ENUM.Http.Headers.FSPIOP.SOURCE] = payload.payerFsp
  headers[ENUM.Http.Headers.FSPIOP.DESTINATION] = payload.payeeFsp
  return {
    headers,
    params: requestParams,
    payload: requestPayload,
    server: {
      log: () => { }
    }
  }
}

Test('bulk transfer error handler', handlerTest => {
  let sandbox

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    // Stub TransferService
    sandbox.stub(TransferService, 'bulkTransferError')
    // Stub MongoDB Schema Object
    sandbox.stub(BulkTransferModels, 'getIndividualTransferFulfilModel').returns(class IndividualTransferFulfilModel {
      save () {
        return Promise.resolve(true)
      }
    })
    sandbox.stub()
    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  handlerTest.test('putBulkTransferErrorById should', async putBulkTransferErrorByIdTest => {
    await putBulkTransferErrorByIdTest.test('reply with status code 200 if message is sent successfully to kafka', async test => {
      const payload = {
        errorInformation: {
          errorCode: '5001',
          errorDescription: 'Payee FSP has insufficient liquidity to perform the transfer'
        },
        extensionList: {
          extension: [{
            key: 'errorDescription',
            value: 'This is a more detailed error description'
          }]
        }
      }
      const params = {
        id: '888ec534-ee48-4575-b6a9-ead2955b8930'
      }
      TransferService.bulkTransferError.returns(Promise.resolve(true))
      const request = createPutRequest(params, payload)
      const reply = {
        // eslint-disable-next-line no-unused-vars
        response: (response) => {
          return {
            code: statusCode => {
              test.equal(statusCode, 200)
              test.end()
            }
          }
        }
      }
      await Handler.put(request, reply)
    })

    await putBulkTransferErrorByIdTest.test('returns error if bulkFulfil throws', async test => {
      const headers = {}
      headers[ENUM.Http.Headers.FSPIOP.SOURCE] = 'source'
      headers[ENUM.Http.Headers.FSPIOP.DESTINATION] = 'destination'
      const request = {
        params: {
          bulkTransferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
        },
        payload: {
          bulkTransferId: 'b51ec534-ee48-4575b6a9-ead2955b8069'
        },
        headers,
        server: {
          log: () => { }
        }
      }
      TransferService.bulkTransferError.rejects(new Error('An error has occurred'))
      try {
        await Handler.put(request)
        test.fail('does not throw')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    putBulkTransferErrorByIdTest.end()
  })
  handlerTest.end()
})
