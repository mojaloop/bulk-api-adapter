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
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 - Steven Oderayi <steven.oderayi@modusbox.com>

 --------------
 ******/

'use strict'

const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-logger')
const EventSdk = require('@mojaloop/event-sdk')
const KafkaUtil = require('@mojaloop/central-services-shared').Util.Kafka
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Config = require('../../lib/config')
const Participant = require('../../domain/participant')
const createCallbackHeaders = require('../../lib/headers').createCallbackHeaders
const Metrics = require('@mojaloop/central-services-metrics')
const ENUM = require('@mojaloop/central-services-shared').Enum
const Util = require('@mojaloop/central-services-shared').Util
const decodePayload = require('@mojaloop/central-services-shared').Util.StreamingProtocol.decodePayload
const BulkTransfer = require('@mojaloop/object-store-lib').Models.BulkTransfer
const JwsSigner = require('@mojaloop/sdk-standard-components').Jws.signer

let notificationConsumer = {}
let autoCommitEnabled = true

const hubNameRegex = Util.HeaderValidation.getHubNameRegex(Config.HUB_NAME)

// note that incoming headers shoud be lowercased by node
// const jwsHeaders = ['fspiop-signature', 'fspiop-http-method', 'fspiop-uri']

/**
 * @module src/handlers/notification
 */

/**
 * @function startConsumer
 * @async
 * @description This will create a kafka consumer which will listen to the notification topics configured in the config
 *
 * @returns {boolean} Returns true on success and throws error on failure
 */
const startConsumer = async () => {
  Logger.info('Notification::startConsumer')
  let topicName
  try {
    const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
    topicName = topicConfig.topicName
    Logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)
    const config = KafkaUtil.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.CONSUMER, ENUM.Events.Event.Type.NOTIFICATION.toUpperCase(), ENUM.Events.Event.Action.EVENT.toUpperCase())
    config.rdkafkaConf['client.id'] = topicName

    if (config.rdkafkaConf['enable.auto.commit'] !== undefined) {
      autoCommitEnabled = config.rdkafkaConf['enable.auto.commit']
    }
    notificationConsumer = new Consumer([topicName], config)
    await notificationConsumer.connect()
    Logger.info(`Notification::startConsumer - Kafka Consumer connected for topicNames: [${topicName}]`)
    await notificationConsumer.consume(consumeMessage)
    Logger.info(`Notification::startConsumer - Kafka Consumer created for topicNames: [${topicName}]`)
    return true
  } catch (err) {
    Logger.error(`Notification::startConsumer - error for topicNames: [${topicName}] - ${err}`)
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

/**
 * @function consumeMessage
 * @async
 * @description This is the callback function for the kafka consumer, this will receive the message from kafka, commit the message and send it for processing
 * processMessage - called to process the message received from kafka
 * @param {object} error - the error message received form kafka in case of error
 * @param {object} message - the message received form kafka

 * @returns {boolean} Returns true on success or false on failure
 */
const consumeMessage = async (error, message) => {
  Logger.info('Notification::consumeMessage')
  const histTimerEnd = Metrics.getHistogram(
    'notification_event',
    'Consume a notification message from the kafka topic and process it accordingly',
    ['success']
  ).startTimer()
  try {
    if (error) {
      const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError(`Error while reading message from kafka ${error}`, error)
      Logger.error(fspiopError)
      throw fspiopError
    }
    Logger.info(`Notification:consumeMessage message: - ${JSON.stringify(message)}`)

    message = (!Array.isArray(message) ? [message] : message)
    let combinedResult = true
    for (const msg of message) {
      Logger.info('Notification::consumeMessage::processMessage')
      const contextFromMessage = EventSdk.Tracer.extractContextFromMessage(msg.value)
      const span = EventSdk.Tracer.createChildSpanFromContext('ml_notification_event', contextFromMessage)
      try {
        await span.audit(msg, EventSdk.AuditEventAction.start)
        const res = await processMessage(msg, span).catch(err => {
          const fspiopError = ErrorHandler.Factory.createInternalServerFSPIOPError('Error processing notification message', err)
          Logger.error(fspiopError)
          if (!autoCommitEnabled) {
            notificationConsumer.commitMessageSync(msg)
          }
          throw fspiopError
        })
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        Logger.debug(`Notification:consumeMessage message processed: - ${res}`)
        combinedResult = (combinedResult && res)
      } catch (err) {
        const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
        const state = new EventSdk.EventStateMetadata(EventSdk.EventStatusType.failed, fspiopError.apiErrorCode.code, fspiopError.apiErrorCode.message)
        await span.error(fspiopError, state)
        await span.finish(fspiopError.message, state)
        throw fspiopError
      } finally {
        if (!span.isFinished) {
          await span.finish()
        }
      }
    }
    histTimerEnd({ success: true })
    return combinedResult
  } catch (err) {
    histTimerEnd({ success: false })
    const fspiopError = ErrorHandler.Factory.reformatFSPIOPError(err)
    Logger.error(fspiopError)
    throw fspiopError
  }
}

/**
* @function processMessage
* @async
* @description This is the function that will process the message received from kafka, it determines the action and status from the message and send calls to appropriate fsp
* Callback.sendCallback - called to send the notification callback
* @param {object} message - the message received from kafka

* @returns {boolean} Returns true on success and throws error on failure
*/

const processMessage = async (msg, span) => {
  try {
    Logger.info('Notification::processMessage')

    if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, 'Invalid message received from kafka')
    }

    const { metadata, from: source, to: destination, content } = msg.value
    const { action, state } = metadata.event
    const messageId = msg.value.id
    const status = state.status

    const actionLower = action.toLowerCase()
    const statusLower = status.toLowerCase()

    Logger.info('Notification::processMessage action: ' + action)
    Logger.info('Notification::processMessage status: ' + status)
    const decodedPayload = decodePayload(content.payload, { asParsed: false })
    let id = JSON.parse(decodedPayload.body.toString()).transferId || (content.uriParams && content.uriParams.id)
    const payloadForCallback = decodedPayload.body.toString()
    let headers // callback headers

    const jwsSigner = getJWSSigner(Config.HUB_NAME)
    const fromSwitch = true

    // Injected Configuration for outbound Content-Type & Accept headers.
    const protocolVersions = {
      content: Config.PROTOCOL_VERSIONS.CONTENT.DEFAULT.toString(),
      accept: Config.PROTOCOL_VERSIONS.ACCEPT.DEFAULT.toString()
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_PREPARE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback) // response payload
      id = payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_POST, id)
      const bulkResponseMessage = await BulkTransfer.getBulkTransferResultByMessageIdDestination(messageId, destination)
      payload.individualTransfers = bulkResponseMessage.individualTransferResults
      headers = createCallbackHeaders({ headers: content.headers, httpMethod: ENUM.Http.RestMethods.POST, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_POST }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest({ ${url}, ${ENUM.Http.RestMethods.POST}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
      return Util.Request.sendRequest({ url, headers, source: Config.HUB_NAME, destination, method: ENUM.Http.RestMethods.POST, payload: JSON.stringify(payload), jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_PREPARE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId || content.uriParams.id
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, id)
      headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest({ ${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
      return Util.Request.sendRequest({ url, headers, source, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_PREPARE_DUPLICATE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId || content.uriParams.id
      delete payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_PUT, id)
      headers = createCallbackHeaders({ dfspId: destination, bulkTransferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest({ ${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
      return Util.Request.sendRequest({ url, headers, source, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_COMMIT && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId
      delete payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_PUT, id)
      const bulkResponseMessage = await BulkTransfer.getBulkTransferResultByMessageIdDestination(messageId, destination)
      payload.individualTransferResults = bulkResponseMessage.individualTransferResults
      headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest({ ${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
      return Util.Request.sendRequest({ url, headers, source: Config.HUB_NAME, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_COMMIT && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId || content.uriParams.id
      delete payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, id)
      headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest({ ${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination} ${hubNameRegex} })`)
      return Util.Request.sendRequest({ url, headers, source, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_GET && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId || content.uriParams.id
      delete payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_PUT, id)
      headers = createCallbackHeaders({ dfspId: destination, bulkTransferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest(${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination})`)
      return Util.Request.sendRequest({ url, headers, source, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_GET && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId || content.uriParams.id
      delete payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, id)
      headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest(${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination})`)
      return Util.Request.sendRequest({ url, headers, source, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_ABORT) {
      const payload = JSON.parse(payloadForCallback)
      id = payload.bulkTransferId || content.uriParams.id
      delete payload.bulkTransferId
      const url = await Participant.getEndpoint(destination, ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR, id)
      headers = createCallbackHeaders({ dfspId: destination, transferId: id, headers: content.headers, httpMethod: ENUM.Http.RestMethods.PUT, endpointTemplate: ENUM.EndPoints.FspEndpointTemplates.BULK_TRANSFERS_PUT_ERROR }, fromSwitch)
      Logger.debug(`Notification::processMessage - Callback.sendRequest(${url}, ${ENUM.Http.RestMethods.PUT}, ${JSON.stringify(headers)}, ${JSON.stringify(payload)}, ${id}, ${source}, ${destination})`)
      return Util.Request.sendRequest({ url, headers, source: Config.HUB_NAME, destination, method: ENUM.Http.RestMethods.PUT, payload, jwsSigner, protocolVersions, hubNameRegex })
    }

    Logger.warn(`Unknown action received from kafka: ${action}`)
  } catch (err) {
    Logger.error(`Error processing the message - ${err}`)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

/**
 * @function getMetadataPromise
 *
 * @description a Promisified version of getMetadata on the kafka consumer
 *
 * @param {Kafka.Consumer} consumer The consumer
 * @param {string} topic The topic name
 * @returns {Promise<object>} Metadata response
 */
const getMetadataPromise = (consumer, topic) => {
  return new Promise((resolve, reject) => {
    const cb = (err, metadata) => {
      if (err) {
        return reject(new Error(`Error connecting to consumer: ${err}`))
      }

      return resolve(metadata)
    }

    consumer.getMetadata({ topic, timeout: 3000 }, cb)
  })
}

/**
 * @function isConnected
 *
 *
 * @description Use this to determine whether or not we are connected to the broker. Internally, it calls `getMetadata` to determine
 * if the broker client is connected.
 *
 * @returns {true} - if connected
 * @throws {Error} - if we can't find the topic name, or the consumer is not connected
 */
const isConnected = async () => {
  const topicConfig = KafkaUtil.createGeneralTopicConf(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Events.Event.Type.NOTIFICATION, ENUM.Events.Event.Action.EVENT)
  const topicName = topicConfig.topicName
  const metadata = await getMetadataPromise(notificationConsumer, topicName)

  const foundTopics = metadata.topics.map(topic => topic.name)
  if (foundTopics.indexOf(topicName) === -1) {
    Logger.debug(`Connected to consumer, but ${topicName} not found.`)
    throw new Error(`Connected to consumer, but ${topicName} not found.`)
  }

  return true
}

/**
 * @function getJWSSigner
 *
 *
 * @description Get the JWS signer if enabled
 *
 * @returns {Object} - returns JWS signer if enabled else returns undefined
 */
const getJWSSigner = (from) => {
  let jwsSigner
  if (Config.JWS_SIGN && from === Config.FSPIOP_SOURCE_TO_SIGN) {
    Logger.isInfoEnabled && Logger.info('Notification::getJWSSigner: get JWS signer')
    jwsSigner = new JwsSigner({
      signingKey: Config.JWS_SIGNING_KEY
    })
  }
  return jwsSigner
}

module.exports = {
  startConsumer,
  processMessage,
  consumeMessage,
  isConnected
}
