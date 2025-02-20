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
const Uuid = require('uuid4')
const Domain = require('../../../../src/domain/bulkTransfer')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const Kafka = require('@mojaloop/central-services-stream').Util
const ENUM = require('@mojaloop/central-services-shared').Enum
const Config = require('../../../../src/lib/config')
const Hash = require('@mojaloop/central-services-shared').Util.Hash
const Logger = require('@mojaloop/central-services-logger')

Test('Transfer domain tests', bulkTransferTest => {
  let sandbox

  bulkTransferTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    sandbox.stub(Logger, 'isErrorEnabled').value(true)
    sandbox.stub(Logger, 'isInfoEnabled').value(true)
    sandbox.stub(Logger, 'isDebugEnabled').value(true)
    sandbox.stub(Kafka.Producer, 'produceMessage')
    sandbox.stub(Kafka.Producer, 'disconnect').returns(Promise.resolve(true))
    t.end()
  })

  bulkTransferTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  bulkTransferTest.test('bulkTransferError should', async bulkTransferErrorTest => {
    const params = { id: '888ec534-ee48-4575-b6a9-ead2955b8930' }
    const bulkTransferId = params.id
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
    const hash = Hash.generateSha256(payload)
    const message = {
      bulkTransferId,
      errorInformation: payload.errorInformation,
      extensionList: payload.extensionList,
      hash
    }
    const headers = { 'fspiop-source': 'payerfsp', 'fspiop-destination': 'payeefsp' }
    const messageId = 'fake-message-id'
    const messageProtocol = {
      id: messageId,
      to: headers['fspiop-destination'],
      from: headers['fspiop-source'],
      type: 'application/vnd.interoperability.bulkTransfers+json;version=1.0',
      content: {
        uriParams: { id: message.bulkTransferId },
        headers,
        payload: message
      },
      metadata: {
        event: {
          id: Uuid(),
          type: 'bulk-fulfil',
          action: 'bulk-abort',
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }

    await bulkTransferErrorTest.test('execute function', async test => {
      const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.BULK, ENUM.Events.Event.Type.FULFIL, null, message.bulkTransferId)
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.PRODUCER, ENUM.Events.Event.Type.BULK.toUpperCase(), ENUM.Events.Event.Action.FULFIL.toUpperCase())
      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(Promise.resolve(true))
      const result = await Domain.bulkTransferError(messageId, headers, message)
      test.equals(result, true)
      test.end()
    })

    await bulkTransferErrorTest.test('throw error', async test => {
      const error = new Error()
      try {
        Kafka.Producer.produceMessage.returns(Promise.reject(error))
        await Domain.bulkTransferError(messageId, headers, message)
        test.fail('error not thrown')
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    bulkTransferErrorTest.end()
  })

  bulkTransferTest.test('getBulkTransferById should', async getBulkByIdTest => {
    const params = { id: '888ec534-ee48-4575-b6a9-ead2955b8930' }
    const headers = { 'fspiop-source': 'payerfsp', 'fspiop-destination': 'payeefsp' }
    const messageId = 'fake-message-id'
    const messageProtocol = {
      id: messageId,
      to: headers['fspiop-destination'],
      from: headers['fspiop-source'],
      type: 'application/vnd.interoperability.bulkTransfers+json;version=1.0',
      content: {
        uriParams: params,
        headers
      },
      metadata: {
        event: {
          id: Uuid(),
          type: ENUM.Events.Event.Type.BULK,
          action: ENUM.Events.Event.Action.GET,
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }

    await getBulkByIdTest.test('execute function', async test => {
      const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.BULK, ENUM.Events.Event.Type.GET)
      const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.PRODUCER, ENUM.Events.Event.Type.BULK.toUpperCase(), ENUM.Events.Event.Action.GET.toUpperCase())
      Kafka.Producer.produceMessage.withArgs(messageProtocol, topicConfig, kafkaConfig).returns(Promise.resolve(true))
      const result = await Domain.getBulkTransferById(messageId, headers, params)
      test.equals(result, true)
      test.end()
    })

    await getBulkByIdTest.test('throw error', async test => {
      const error = new Error()
      try {
        Kafka.Producer.produceMessage.returns(Promise.reject(error))
        await Domain.getBulkTransferById(messageId, headers, params)
        test.fail('error not thrown')
      } catch (e) {
        test.ok(e instanceof Error)
        test.end()
      }
    })

    getBulkByIdTest.end()
  })

  bulkTransferTest.end()
})
