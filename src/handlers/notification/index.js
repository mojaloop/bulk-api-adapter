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

 * Georgi Georgiev <georgi.georgiev@modusbox.com>
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Consumer = require('@mojaloop/central-services-stream').Kafka.Consumer
const Logger = require('@mojaloop/central-services-shared').Logger
const Participant = require('../../domain/participant')
const Config = require('../../lib/config')

let notificationConsumer = {}
let autoCommitEnabled = true
const Metrics = require('@mojaloop/central-services-metrics')
const ENUM = require('@mojaloop/central-services-shared').Enum
const Util = require('@mojaloop/central-services-shared').Util
const decodePayload = require('@mojaloop/central-services-stream').Kafka.Protocol.decodePayload
const BulkTransfer = require('@mojaloop/central-object-store').Models.BulkTransfer

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
* @returns {boolean} Returns true on sucess and throws error on failure
*/

const startConsumer = async () => {
  Logger.info('Notification::startConsumer')
  let topicName
  try {
    topicName = Util.Kafka.transformGeneralTopicName(Config.KAFKA_CONFIG.TOPIC_TEMPLATES.GENERAL_TOPIC_TEMPLATE.TEMPLATE, ENUM.Kafka.Topics.NOTIFICATION, ENUM.Kafka.Topics.EVENT)
    Logger.info(`Notification::startConsumer - starting Consumer for topicNames: [${topicName}]`)
    let config = Util.Kafka.getKafkaConfig(Config.KAFKA_CONFIG, ENUM.Kafka.Config.CONSUMER, ENUM.Kafka.Topics.NOTIFICATION.toUpperCase(), ENUM.Kafka.Topics.EVENT.toUpperCase())
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
    throw err
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
  return new Promise(async (resolve, reject) => {
    const histTimerEnd = Metrics.getHistogram(
      'notification_event',
      'Consume a notification message from the kafka topic and process it accordingly',
      ['success']
    ).startTimer()
    if (error) {
      Logger.error(`Error while reading message from kafka ${error}`)
      return reject(error)
    }
    Logger.info(`Notification:consumeMessage message: - ${JSON.stringify(message)}`)

    message = (!Array.isArray(message) ? [message] : message)
    let combinedResult = true
    for (let msg of message) {
      Logger.info('Notification::consumeMessage::processMessage')
      let res = await processMessage(msg).catch(err => {
        Logger.error(`Error processing the kafka message - ${err}`)
        if (!autoCommitEnabled) {
          notificationConsumer.commitMessageSync(msg)
        }
        // return reject(err) // This is not handled correctly as we need to deal with the error here
        return resolve(err) // We return 'resolved' since we have dealt with the error here
      })
      if (!autoCommitEnabled) {
        notificationConsumer.commitMessageSync(msg)
      }
      Logger.debug(`Notification:consumeMessage message processed: - ${res}`)
      combinedResult = (combinedResult && res)
    }
    histTimerEnd({ success: true })
    return resolve(combinedResult)
  })
}

/**
* @function processMessage
* @async
* @description This is the function that will process the message received from kafka, it determined the action and status from the message and sends calls to appropriate fsp
* Callback.sendCallback - called to send the notification callback
* @param {object} message - the message received form kafka

* @returns {boolean} Returns true on sucess and throws error on failure
*/

const processMessage = async (msg) => {
  try {
    Logger.info('Notification::processMessage')

    if (!msg.value || !msg.value.content || !msg.value.content.headers || !msg.value.content.payload) {
      throw new Error('Invalid message received from kafka')
    }

    const { metadata, from, to, content } = msg.value
    const { action, state } = metadata.event
    const messageId = msg.value.id
    const status = state.status

    const actionLower = action.toLowerCase()
    const statusLower = status.toLowerCase()

    Logger.info('Notification::processMessage action: ' + action)
    Logger.info('Notification::processMessage status: ' + status)
    let decodedPayload = decodePayload(content.payload, { asParsed: false })
    let id = JSON.parse(decodedPayload.body.toString()).transferId || (content.uriParams && content.uriParams.id)
    let payloadForCallback = decodedPayload.body.toString()

    if (actionLower === ENUM.Events.Event.Action.BULK_PREPARE && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
      let responsePayload = JSON.parse(payloadForCallback)
      id = responsePayload.bulkTransferId
      let methodTo = ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_POST
      let callbackURLTo = await Participant.getEndpoint(to, methodTo, id)
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      let bulkResponseMessage = await BulkTransfer.getBulkTransferResultByMessageIdDestination(messageId, to)
      responsePayload.individualTransferResults = bulkResponseMessage.individualTransferResults
      return Util.Request.sendRequest(callbackURLTo, content.headers, from, to, methodTo, JSON.stringify(responsePayload))
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_PREPARE && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
      id = JSON.parse(payloadForCallback).bulkTransferId
      let methodFrom = ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR
      let callbackURLTo = await Participant.getEndpoint(to, methodFrom, id)
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${payloadForCallback}, ${id}, ${from}, ${to})`)
      return Util.Request.sendRequest(callbackURLTo, content.headers, from, to, methodFrom, payloadForCallback)
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_COMMIT && statusLower === ENUM.Events.EventStatus.SUCCESS.status) {
      let responsePayload = JSON.parse(payloadForCallback)
      id = responsePayload.bulkTransferId
      delete responsePayload.bulkTransferId
      let methodTo = ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_PUT
      let callbackURLTo = await Participant.getEndpoint(to, methodTo, id)
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodTo}, ${JSON.stringify(content.headers)}, ${JSON.stringify(responsePayload)}, ${id}, ${from}, ${to})`)
      let bulkResponseMessage = await BulkTransfer.getBulkTransferResultByMessageIdDestination(messageId, to)
      responsePayload.individualTransferResults = bulkResponseMessage.individualTransferResults
      return Util.Request.sendRequest(callbackURLTo, content.headers, from, to, methodTo, payloadForCallback)
    }

    if (actionLower === ENUM.Events.Event.Action.BULK_COMMIT && statusLower !== ENUM.Events.EventStatus.SUCCESS.status) {
      let responsePayload = JSON.parse(payloadForCallback)
      id = responsePayload.bulkTransferId
      delete responsePayload.bulkTransferId
      let methodFrom = ENUM.EndPoints.FspEndpointTypes.FSPIOP_CALLBACK_URL_BULK_TRANSFER_ERROR
      let callbackURLTo = await Participant.getEndpoint(to, methodFrom, id)
      Logger.debug(`Notification::processMessage - Callback.sendCallback(${callbackURLTo}, ${methodFrom}, ${JSON.stringify(content.headers)}, ${JSON.stringify(responsePayload)}, ${id}, ${from}, ${to})`)
      return Util.Request.sendRequest(callbackURLTo, content.headers, from, to, methodFrom, JSON.stringify(responsePayload))
    }

    Logger.warn(`Unknown action received from kafka: ${action}`)
  } catch (e) {
    Logger.error(`Error processing the message - ${e}`)
    throw e
  }
}

module.exports = {
  startConsumer,
  processMessage,
  consumeMessage
}
