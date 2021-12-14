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
const Uuid = require('uuid4')
const Proxyquire = require('proxyquire')

const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-logger')
const Util = require('@mojaloop/central-services-shared').Util
const ENUM = require('@mojaloop/central-services-shared').Enum

const src = '../../../../../src'
const Notification = require(`${src}/handlers/notification`)
const createCallbackHeaders = require(`${src}/lib/headers`).createCallbackHeaders
const Participant = require(`${src}/domain/participant`)
const Config = require(`${src}/lib/config.js`)

Test('Notification handler tests', async notificationTest => {
  let sandbox
  const url = 'http://somehost:port/'

  await notificationTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Consumer.prototype, 'constructor')

    sandbox.stub(Consumer.prototype, 'connect').returns(Promise.resolve(true))
    sandbox.stub(Consumer.prototype, 'consume').returns(Promise.resolve(true))
    sandbox.stub(Consumer.prototype, 'commitMessageSync').returns(Promise.resolve(true))
    sandbox.stub(Participant, 'getEndpoint').returns(Promise.resolve(url))

    sandbox.stub(Logger)
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)

    sandbox.stub(Util.Request, 'sendRequest').returns(Promise.resolve(200))
    t.end()
  })

  await notificationTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  await notificationTest.test('processMessage should', async processMessageTest => {
    await processMessageTest.test('process the bulk-abort message received from kafka and send out a bulk transfer put callback', async test => {
      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'bulk-prepare',
              action: 'bulk-abort',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            uriParams: { id: uuid },
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { bulkTransferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, msg.value.content.payload.bulkTransferId)
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, bulkTransferId: msg.value.content.payload.bulkTransferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR })
      const message = {}

      const expected = 200

      Util.Request.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, message).returns(Promise.resolve(200))

      const result = await Notification.processMessage(msg)
      test.ok(Util.Request.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, message))
      test.equal(result, expected)
      test.end()
    })

    await processMessageTest.test('process the bulk-abort message received from kafka and send out a bulk transfer put callback with injected PROTOCOL_VERSIONS config', async test => {
      // setup config
      const ConfigStub = Util.clone(Config)
      // override the PROTOCOL_VERSIONS config
      ConfigStub.PROTOCOL_VERSIONS = {
        CONTENT: '2.1',
        ACCEPT: {
          DEFAULT: '2',
          VALIDATELIST: [
            '2',
            '2.1'
          ]
        }
      }

      const NotificationProxy = Proxyquire(`${src}/handlers/notification`, {
        '../../lib/config': ConfigStub
      })

      const uuid = Uuid()
      const payerFsp = 'dfsp2'
      const payeeFsp = 'dfsp1'
      const msg = {
        value: {
          metadata: {
            event: {
              type: 'bulk-prepare',
              action: 'bulk-abort',
              state: {
                status: 'success',
                code: 0
              }
            }
          },
          content: {
            uriParams: { id: uuid },
            headers: {
              'FSPIOP-Destination': payeeFsp,
              'FSPIOP-Source': payerFsp
            },
            payload: { bulkTransferId: uuid }
          },
          to: payeeFsp,
          from: payerFsp,
          id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
        }
      }
      const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, msg.value.content.payload.bulkTransferId)
      const method = ENUM.Http.RestMethods.PUT
      const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, bulkTransferId: msg.value.content.payload.bulkTransferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR })
      const message = {}

      const expected = 200

      Util.Request.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, message).returns(Promise.resolve(200))

      const result = await NotificationProxy.processMessage(msg)
      test.ok(Util.Request.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, message, null, null, null, {
        accept: ConfigStub.PROTOCOL_VERSIONS.ACCEPT.DEFAULT,
        content: ConfigStub.PROTOCOL_VERSIONS.CONTENT
      }))
      test.equal(result, expected)
      test.end()
    })

    // Commented out as its being skipped, which forces the remainder of the tests to be skipped.
    // await processMessageTest.test.skip('process the bulk-abort message received from kafka and send out a bulk transfer put callback', async test => {
    //   const uuid = Uuid()
    //   const payerFsp = 'dfsp2'
    //   const payeeFsp = 'dfsp1'
    //   const msg = {
    //     value: {
    //       metadata: {
    //         event: {
    //           type: 'bulk-fulfil',
    //           action: 'bulk-abort',
    //           state: {
    //             status: 'success',
    //             code: 0
    //           }
    //         }
    //       },
    //       content: {
    //         uriParams: { id: uuid },
    //         headers: {
    //           'FSPIOP-Destination': payeeFsp,
    //           'FSPIOP-Source': payerFsp
    //         },
    //         payload: { bulkTransferId: uuid }
    //       },
    //       to: payeeFsp,
    //       from: payerFsp,
    //       id: 'b51ec534-ee48-4575-b6a9-ead2955b8098'
    //     }
    //   }
    //   const toUrl = await Participant.getEndpoint(msg.value.to, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, msg.value.content.payload.bulkTransferId)
    //   const method = ENUM.Http.RestMethods.PUT
    //   const toHeaders = createCallbackHeaders({ dfspId: msg.value.to, bulkTransferId: msg.value.content.payload.bulkTransferId, headers: msg.value.content.headers, httpMethod: method, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR })
    //   const message = {}

    //   const expected = 200
    //   const logger = Logger
    //   logger.log = logger.info

    //   Util.Request.sendRequest.withArgs(toUrl, toHeaders, msg.value.from, msg.value.to, method, message).returns(Promise.resolve(200))

    //   const result = await Notification.processMessage(msg)
    //   test.ok(Util.Request.sendRequest.calledWith(toUrl, toHeaders, msg.value.from, msg.value.to, method, message))
    //   test.equal(result, expected)
    //   test.end()
    // })

    await processMessageTest.end()
  })

  await notificationTest.end()
})
