/*****
 License
 --------------
 Copyright © 2017 Bill & Melinda Gates Foundation
 The Mojaloop files are made available by the Bill & Melinda Gates Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at
 http://www.apache.org/licenses/LICENSE-2.0
 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Gates Foundation organization for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.
 * Gates Foundation
 - Name Surname <name.surname@gatesfoundation.com>

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
const Handler = require('../../../../../src/api/handlers/bulkTransfers/{id}')
const TransferService = require('../../../../../src/domain/bulkTransfer')
const BulkTransferModels = require('@mojaloop/object-store-lib').Models.BulkTransfer

const createGetRequest = (params, sourceFsp) => {
  const requestParams = params || {}
  const headers = {}
  headers[ENUM.Http.Headers.FSPIOP.SOURCE] = sourceFsp
  headers[ENUM.Http.Headers.FSPIOP.DESTINATION] = 'switch'
  return {
    headers,
    params: requestParams,
    server: {
      log: () => { }
    }
  }
}

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

Test('GET /bulkTransfer/{id} handler', handlerTest => {
  let sandbox

  handlerTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    sandbox.stub(TransferService, 'getBulkTransferById')
    sandbox.stub(TransferService, 'bulkFulfil')
    sandbox.stub(BulkTransferModels, 'getIndividualTransferFulfilModel').returns(class IndividualTransferFulfilModel {
      save () {
        return Promise.resolve(true)
      }
    })
    t.end()
  })

  handlerTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  handlerTest.test('getBulkTransferById should', async getByIdTest => {
    await getByIdTest.test('reply with status code 202 if message is sent successfully to kafka', async test => {
      const params = {
        id: '888ec534-ee48-4575-b6a9-ead2955b8930'
      }
      TransferService.getBulkTransferById.returns(Promise.resolve(true))
      const request = createGetRequest(params, 'source')
      const reply = {
        response: (response) => {
          return {
            code: statusCode => {
              test.equal(statusCode, 202)
              test.end()
            }
          }
        }
      }
      await Handler.get(request, reply)
    })

    await getByIdTest.test('returns error if getBulkTransferById throws', async test => {
      const headers = {}
      headers[ENUM.Http.Headers.FSPIOP.SOURCE] = 'source'
      headers[ENUM.Http.Headers.FSPIOP.DESTINATION] = 'destination'
      const request = {
        params: {
          id: 'b51ec534-ee48-4575b6a9-ead2955b8069'
        },
        headers,
        server: {
          log: () => { }
        }
      }
      TransferService.getBulkTransferById.rejects(new Error('An error has occurred'))
      try {
        await Handler.get(request)
        test.fail('does not throw')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    getByIdTest.end()
  })

  handlerTest.test('BulkTransfersByIDPut should', async bulkTransfersByIDPut => {
    await bulkTransfersByIDPut.test('reply with status code 200 if message is sent successfully to kafka', async test => {
      const params = {
        id: '888ec534-ee48-4575-b6a9-ead2955b8930'
      }
      const payload = {
        bulkTransferState: 'COMPLETED',
        completedTimestamp: '2022-08-18T01:00:24.407Z',
        individualTransferResults: [
          {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8068',
            fulfilment: 'UNlJ98hZTY_dsw0cAqw4i_UN3v4utt7CZFB4yfLbVFA'
          },
          {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069',
            fulfilment: 'UNlJ98hZTY_dsw0cAqw4i_UN3v4utt7CZFB4yfLbVFA'
          }
        ]
      }
      TransferService.bulkFulfil.returns(Promise.resolve(true))
      const request = createPutRequest(params, payload)
      const reply = {
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

    await bulkTransfersByIDPut.test('returns error if BulkTransfersByIDPut throws', async test => {
      const headers = {}
      headers[ENUM.Http.Headers.FSPIOP.SOURCE] = 'source'
      headers[ENUM.Http.Headers.FSPIOP.DESTINATION] = 'destination'
      const params = {
        id: '888ec534-ee48-4575-b6a9-ead2955b8930'
      }
      const payload = {
        bulkTransferState: 'COMPLETED',
        completedTimestamp: '2022-08-18T01:00:24.407Z',
        individualTransferResults: [
          {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8068',
            fulfilment: 'UNlJ98hZTY_dsw0cAqw4i_UN3v4utt7CZFB4yfLbVFA'
          },
          {
            transferId: 'b51ec534-ee48-4575b6a9-ead2955b8069',
            fulfilment: 'UNlJ98hZTY_dsw0cAqw4i_UN3v4utt7CZFB4yfLbVFA'
          }
        ]
      }
      TransferService.bulkFulfil.rejects(new Error('An error has occurred'))
      const request = createPutRequest(params, payload)

      try {
        await Handler.put(request)
        test.fail('does not throw')
      } catch (e) {
        test.ok(e instanceof FSPIOPError)
        test.equal(e.message, 'An error has occurred')
        test.end()
      }
    })

    bulkTransfersByIDPut.end()
  })
  handlerTest.end()
})
