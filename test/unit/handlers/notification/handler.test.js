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

 * Miguel de Barros <miguel.debarros@modusbox.com>
 --------------
 ******/
'use strict'

const Uuid = require('uuid4')
const Sinon = require('sinon')
const Proxyquire = require('proxyquire')
const Test = require('tapes')(require('tape'))
const Kafka = require('@mojaloop/central-services-shared').Util.Kafka
const MainUtil = require('@mojaloop/central-services-shared').Util
const KafkaConsumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Consumer = require('@mojaloop/central-services-stream').Util.Consumer
const Enum = require('@mojaloop/central-services-shared').Enum
const BulkTransferModels = require('@mojaloop/object-store-lib').Models.BulkTransfer
const Participant = require('#src/domain/participant/index')
const Config = require('#src/lib/config')

// Sample Bulk Prepare Transfer Message received by the Bulk API Adapter
const fspiopBulkPrepareTransferMsg = {
  bulkTransferId: 'fake-bulk-transfer-id',
  bulkQuoteId: 'fake-bulk-quote-id',
  payerFsp: 'dfsp1',
  payeeFsp: 'dfsp2',
  expiration: '2016-05-24T08:38:08.699-04:00',
  individualTransfers: [
    {
      transferId: 'b51ec534-ee48-4575-b6a9-ead2955b8999',
      transferAmount: {
        currency: 'USD',
        amount: '433.88'
      },
      ilpPacket: 'AYIBgQAAAAAAAASwNGxldmVsb25lLmRmc3AxLm1lci45T2RTOF81MDdqUUZERmZlakgyOVc4bXFmNEpLMHlGTFGCAUBQU0svMS4wCk5vbmNlOiB1SXlweUYzY3pYSXBFdzVVc05TYWh3CkVuY3J5cHRpb246IG5vbmUKUGF5bWVudC1JZDogMTMyMzZhM2ItOGZhOC00MTYzLTg0NDctNGMzZWQzZGE5OGE3CgpDb250ZW50LUxlbmd0aDogMTM1CkNvbnRlbnQtVHlwZTogYXBwbGljYXRpb24vanNvbgpTZW5kZXItSWRlbnRpZmllcjogOTI4MDYzOTEKCiJ7XCJmZWVcIjowLFwidHJhbnNmZXJDb2RlXCI6XCJpbnZvaWNlXCIsXCJkZWJpdE5hbWVcIjpcImFsaWNlIGNvb3BlclwiLFwiY3JlZGl0TmFtZVwiOlwibWVyIGNoYW50XCIsXCJkZWJpdElkZW50aWZpZXJcIjpcIjkyODA2MzkxXCJ9IgA',
      condition: 'YlK5TZyhflbXaDRPtR5zhCu8FrbgvrQwwmzuH0iQ0AI'
    }
  ],
  extensionList: {
    extension: [
      {
        key: 'key1',
        value: 'value1'
      },
      {
        key: 'key2',
        value: 'value2'
      }
    ]
  }
}

// Sample Bulk Fulfil Transfer Message sent by the Bulk API Adapter Notification Handler as a callback
const fspiopBulkFulfilTransferMsg = {
  bulkTransferState: Enum.Transfers.BulkTransferState.COMPLETED,
  completedTimestamp: new Date().toISOString(),
  individualTransferResults: [
    {
      transferId: fspiopBulkPrepareTransferMsg.individualTransfers[0].transferId,
      fulfilment: 'tChMwYE5Zw9ZDiU6cUQyeLmReAE55dG74MJKHPWNjvs'
    }
  ]
}

// Sample Kafka protocol message
const messageProtocol = {
  id: Uuid(),
  from: fspiopBulkPrepareTransferMsg.payerFsp,
  to: fspiopBulkPrepareTransferMsg.payeeFsp,
  type: 'application/json',
  content: {
    headers: {
      'content-type': 'application/vnd.interoperability.bulkTransfers+json;version=1.1',
      'fspiop-source': fspiopBulkPrepareTransferMsg.payeeFsp,
      'fspiop-destination': 'source',
      date: new Date().toISOString()
    },
    payload: fspiopBulkPrepareTransferMsg
  },
  metadata: {
    event: {
      id: Uuid(),
      type: Enum.Events.Event.Type.NOTIFICATION,
      action: Enum.Events.Event.Action.BULK_PREPARE,
      createdAt: new Date().toISOString(),
      state: {
        status: 'success',
        code: 0
      }
    },
    'protocol.createdAt': new Date().getTime()
  },
  pp: ''
}

// Sample Kafka topic name
const topicName = 'topic-test'

// Sample Kafka config
const config = {
  options: {
    mode: 2,
    batchSize: 1,
    pollFrequency: 10,
    recursiveTimeout: 100,
    messageCharset: 'utf8',
    messageAsJSON: true,
    sync: true,
    consumeTimeout: 1000
  },
  rdkafkaConf: {
    'client.id': 'kafka-test',
    debug: 'all',
    'group.id': 'central-ledger-kafka',
    'metadata.broker.list': 'localhost:9092',
    'enable.auto.commit': false
  }
}

Test('Bulk Transfer PREPARE handler', handlerTest => {
  let sandbox
  let SpanStub
  let notificationHandler
  const postCallbackUrl = 'http://test.local/bulkTransfers'
  const putCallbackUrl = 'http://test.local/bulkTransfers/{{id}}'
  // For ErrorCallback Scenarios
  // const putErrorCallbackUrl = 'http://test.local/bulkTransfers/{{id}}/error'

  handlerTest.beforeEach(test => {
    sandbox = Sinon.createSandbox()
    SpanStub = {
      audit: sandbox.stub().callsFake(),
      error: sandbox.stub().callsFake(),
      finish: sandbox.stub().callsFake(),
      debug: sandbox.stub().callsFake(),
      info: sandbox.stub().callsFake(),
      getChild: sandbox.stub().returns(SpanStub),
      setTags: sandbox.stub().callsFake()
    }

    const TracerStub = {
      extractContextFromMessage: sandbox.stub().callsFake(() => {
        return {}
      }),
      createChildSpanFromContext: sandbox.stub().callsFake(() => {
        return SpanStub
      })
    }

    const EventSdkStub = {
      Tracer: TracerStub
    }

    notificationHandler = Proxyquire('#src/handlers/notification/index', {
      '@mojaloop/event-sdk': EventSdkStub
      // '@mojaloop/object-store-lib': TODO
    })

    sandbox.stub(BulkTransferModels)

    sandbox.stub(Participant)

    sandbox.stub(KafkaConsumer.prototype, 'constructor').returns(Promise.resolve())
    sandbox.stub(KafkaConsumer.prototype, 'connect').returns(Promise.resolve())
    sandbox.stub(KafkaConsumer.prototype, 'consume').returns(Promise.resolve())
    sandbox.stub(KafkaConsumer.prototype, 'commitMessageSync').returns(Promise.resolve())
    sandbox.stub(Consumer, 'getConsumer').returns({
      commitMessageSync: async function () {
        return true
      }
    })
    sandbox.stub(Consumer, 'isConsumerAutoCommitEnabled').returns(false)

    sandbox.stub(Kafka, 'produceParticipantMessage')
    sandbox.stub(Kafka, 'produceGeneralMessage')
    sandbox.stub(Kafka, 'commitMessageSync')
    sandbox.stub(Kafka, 'getKafkaConfig')
    sandbox.stub(Kafka, 'proceed')
    Kafka.getKafkaConfig.returns(config)
    Kafka.produceGeneralMessage.returns(Promise.resolve())
    Kafka.proceed.returns(true)

    sandbox.stub(MainUtil.StreamingProtocol)
    sandbox.stub(MainUtil.Request)
    MainUtil.Request.sendRequest.resolves(true)

    test.end()
  })

  handlerTest.afterEach(test => {
    sandbox.restore()
    test.end()
  })

  handlerTest.test('Bulk Notification handler startConsumer should', startConsumerTest => {
    startConsumerTest.test('create a kafka consumer which will listen to the notification topics configured in the config', async (test) => {
      // Arrange
      // Nothing to do here...

      // Act
      const result = await notificationHandler.startConsumer()

      // Asert
      test.equal(result, true)
      test.end()
    })

    // TODO: Error/Failure Scenarios

    startConsumerTest.end()
  })

  handlerTest.test('Bulk Notification handler processMessage should', processMessageTest => {
    processMessageTest.test(`handle Notification event ACTION "${Enum.Events.Event.Action.BULK_PREPARE}" with STATUS "${Enum.Events.EventStatus.SUCCESS.status}"`, async (test) => {
      try {
        // Arrange
        Participant.getEndpoint.resolves(postCallbackUrl)

        // setup consumed kafka message
        const localMessage = {
          topic: topicName,
          value: MainUtil.clone(messageProtocol)
        }
        // set Payload
        localMessage.value.content.payload = fspiopBulkPrepareTransferMsg
        // set Event Action
        localMessage.value.metadata.event.action = Enum.Events.Event.Action.BULK_PREPARE

        const getBulkTransferResultByMessageIdDestinationResponse = {
          individualTransferResults: MainUtil.clone(fspiopBulkPrepareTransferMsg.individualTransfers)
        }

        BulkTransferModels.getBulkTransferResultByMessageIdDestination.resolves(getBulkTransferResultByMessageIdDestinationResponse)

        // Act
        const result = await notificationHandler.processMessage(localMessage, null)

        // Assert
        test.equal(result, true)
        const args = MainUtil.Request.sendRequest.lastCall.args[0]
        test.equal(args.url, postCallbackUrl)
        test.equal(args.source, Config.HUB_NAME)
        test.equal(args.destination, fspiopBulkPrepareTransferMsg.payeeFsp)
        test.equal(args.method, Enum.Http.RestMethods.POST)
        test.equal(args.payload, JSON.stringify(fspiopBulkPrepareTransferMsg))

        test.end()
      } catch (err) {
        // Assert
        console.log(err)
        test.fail('Error should NOT have been cought here!')
        test.end()
      }
    })

    processMessageTest.test(`handle Notification event ACTION "${Enum.Events.Event.Action.BULK_PREPARE_DUPLICATE}" with STATUS "${Enum.Events.EventStatus.SUCCESS.status}"`, async (test) => {
      try {
        // Arrange
        Participant.getEndpoint.resolves(putCallbackUrl)

        // setup consumed kafka message
        const localMessage = {
          topic: topicName,
          value: MainUtil.clone(messageProtocol)
        }
        // set Payload
        localMessage.value.content.payload = {
          bulkTransferId: fspiopBulkPrepareTransferMsg.bulkTransferId,
          ...MainUtil.clone(fspiopBulkFulfilTransferMsg)
        }
        // set Event Action
        localMessage.value.metadata.event.action = Enum.Events.Event.Action.BULK_PREPARE_DUPLICATE

        // Act
        const result = await notificationHandler.processMessage(localMessage, null)

        // Assert
        test.equal(result, true)
        const args = MainUtil.Request.sendRequest.lastCall.args[0]
        test.equal(args.url, putCallbackUrl)
        test.equal(args.source, fspiopBulkPrepareTransferMsg.payerFsp)
        test.equal(args.destination, fspiopBulkPrepareTransferMsg.payeeFsp)
        test.equal(args.method, Enum.Http.RestMethods.PUT)
        test.same(args.payload, fspiopBulkFulfilTransferMsg)

        test.end()
      } catch (err) {
        // Assert
        console.log(err)
        test.fail('Error should NOT have been cought here!')
        test.end()
      }
    })

    // TODO: Test different combinations scenarios for ACTION + STATUS, and Error/Failure Scenarios

    processMessageTest.end()
  })

  handlerTest.end()
})
