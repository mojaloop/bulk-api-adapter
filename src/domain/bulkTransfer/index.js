/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
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
 - Name Surname <name.surname@mojaloop.io>

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Steven Oderayi <steven.oderayi@modusbox.com>
 --------------
 ******/
'use strict'

const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Uuid = require('uuid4')
const Config = require('../../lib/config')
const ENUM = require('@mojaloop/central-services-shared').Enum
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const Producer = require('@mojaloop/central-services-stream').Util.Producer

/**
 * @module src/domain/bulkTransfer
 */

/**
* @function bulkPrepare
* @async
* @description This will produce a transfer bulkPrepare message to transfer bulkPrepare kafka topic. It gets the kafka configuration from config. It constructs the message and published to kafka
*
* @param {object} headers - the http header from the request
* @param {object} message - the transfer bulkPrepare message
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const bulkPrepare = async (messageId, headers, message) => {
  Logger.debug('domain::bulk-transfer::prepare::start(%s, %s)', headers, message)
  try {
    const messageProtocol = {
      id: messageId,
      from: headers[ENUM.Http.Headers.FSPIOP.SOURCE],
      to: headers[ENUM.Http.Headers.FSPIOP.DESTINATION],
      type: ENUM.Http.Headers.DEFAULT.APPLICATION_JSON,
      content: {
        headers,
        payload: message
      },
      metadata: {
        event: {
          id: Uuid(),
          type: ENUM.Events.Event.Type.BULK_PREPARE,
          action: ENUM.Events.Event.Action.BULK_PREPARE,
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.BULK, ENUM.Events.Event.Action.PREPARE)
    // ity.createGeneralTopicConf(BULK_TRANSFER, PREPARE)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.PRODUCER, ENUM.Events.Event.Type.BULK.toUpperCase(), ENUM.Events.Event.Type.PREPARE.toUpperCase())
    Logger.debug(`domain::bulkTransfer::prepare::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::bulkTransfer::prepare::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::bulkTransfer::prepare::kafkaConfig - ${kafkaConfig}`)
    await Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::bulkTransfer::prepare::Kafka error:: ERROR:'${err}'`)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const bulkFulfil = async (messageId, headers, message) => {
  Logger.debug('domain::bulk-transfer::fulfil::start(%s, %s)', headers, message)
  try {
    const messageProtocol = {
      id: messageId,
      to: headers[ENUM.Http.Headers.FSPIOP.DESTINATION],
      from: headers[ENUM.Http.Headers.FSPIOP.SOURCE],
      type: ENUM.Http.Headers.DEFAULT.APPLICATION_JSON,
      content: {
        uriParams: { id: message.bulkTransferId },
        headers,
        payload: message
      },
      metadata: {
        event: {
          id: Uuid(),
          type: ENUM.Events.Event.Type.BULK_FULFIL,
          action: ENUM.Events.Event.Action.BULK_COMMIT,
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.BULK, ENUM.Events.Event.Type.FULFIL)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.PRODUCER, ENUM.Events.Event.Type.BULK.toUpperCase(), ENUM.Events.Event.Type.FULFIL.toUpperCase())
    Logger.debug(`domain::bulkTransfer::fulfil::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::bulkTransfer::fulfil::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::bulkTransfer::fulfil::kafkaConfig - ${kafkaConfig}`)
    await Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::bulkTransfer::fulfil::Kafka error:: ERROR:'${err}'`)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

const bulkTransferError = async (messageId, headers, message) => {
  Logger.debug('domain::bulk-transfer::abort::start(%s, %s)', headers, message)
  try {
    const messageProtocol = {
      id: messageId,
      to: headers[ENUM.Http.Headers.FSPIOP.DESTINATION],
      from: headers[ENUM.Http.Headers.FSPIOP.SOURCE],
      type: ENUM.Http.Headers.DEFAULT.APPLICATION_JSON,
      content: {
        uriParams: { id: message.bulkTransferId },
        headers,
        payload: message
      },
      metadata: {
        event: {
          id: Uuid(),
          type: ENUM.Events.Event.Type.BULK_FULFIL,
          action: ENUM.Events.Event.Action.BULK_ABORT,
          createdAt: new Date(),
          state: {
            status: 'success',
            code: 0
          }
        }
      }
    }
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.BULK, ENUM.Events.Event.Type.FULFIL)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.PRODUCER, ENUM.Events.Event.Type.BULK.toUpperCase(), ENUM.Events.Event.Type.FULFIL.toUpperCase())
    Logger.debug(`domain::bulkTransfer::abort::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::bulkTransfer::abort::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::bulkTransfer::abort::kafkaConfig - ${kafkaConfig}`)
    await Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::bulkTransfer::abort::Kafka error:: ERROR:'${err}'`)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
* @function getBulkTransferById
* @async
* @description This will produce a bulk transfer GET message to bulk transfer GET kafka topic. It gets the kafka configuration from config. It constructs the message and publish to kafka
*
* @param {object} headers - the http header from the request
* @param {object} params - the http request uri parameters
*
* @returns {boolean} Returns true on successful publishing of message to kafka, throws error on failures
*/
const getBulkTransferById = async (messageId, headers, params) => {
  Logger.debug('domain::bulk-transfer::get::start(%s, %s)', params.id, headers)
  try {
    const messageProtocol = {
      id: messageId,
      from: headers[ENUM.Http.Headers.FSPIOP.SOURCE],
      to: headers[ENUM.Http.Headers.FSPIOP.DESTINATION],
      type: ENUM.Http.Headers.DEFAULT.APPLICATION_JSON,
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
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.BULK, ENUM.Events.Event.Action.GET)
    const kafkaConfig = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.PRODUCER, ENUM.Events.Event.Type.BULK.toUpperCase(), ENUM.Events.Event.Type.GET.toUpperCase())
    Logger.debug(`domain::bulkTransfer::get::messageProtocol - ${messageProtocol}`)
    Logger.debug(`domain::bulkTransfer::get::topicConfig - ${topicConfig}`)
    Logger.debug(`domain::bulkTransfer::get::kafkaConfig - ${kafkaConfig}`)
    await Producer.produceMessage(messageProtocol, topicConfig, kafkaConfig)
    return true
  } catch (err) {
    Logger.error(`domain::bulkTransfer::get::Kafka error:: ERROR:'${err}'`)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  bulkPrepare,
  bulkFulfil,
  bulkTransferError,
  getBulkTransferById
}
