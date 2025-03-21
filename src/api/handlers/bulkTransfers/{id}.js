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
 - Valentin Genev <valentin.genev@modusbox.com>
 - Steven Oderayi <steven.oderayi@modusbox.com>
 --------------
 ******/
'use strict'

const Uuid = require('uuid4')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const BulkTransferModels = require('@mojaloop/object-store-lib').Models.BulkTransfer
const Hash = require('@mojaloop/central-services-shared').Util.Hash
const HTTPENUM = require('@mojaloop/central-services-shared').Enum.Http
const TransferService = require('../../../domain/bulkTransfer')

/**
 * Operations on /bulkTransfers/{id}
 */
module.exports = {
  /**
   * summary: Get a bulk transfer by Id
   * description:
   * parameters: accept, content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id
   * produces:
   * responses: default
   */
  get: async function getBulkTransfersId (request, h) {
    try {
      Logger.isInfoEnabled && Logger.info(`getBulkTransfersId::id(${request.params.id})`)
      const messageId = Uuid()
      await TransferService.getBulkTransferById(messageId, request.headers, request.params)
      return h.response().code(HTTPENUM.ReturnCodes.ACCEPTED.CODE)
    } catch (err) {
      Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  },
  /**
   * summary: Fulfil bulkTransfer
   * description:
   * parameters: content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id, body
   * produces:
   * responses: default
   */
  put: async function BulkTransfersByIDPut (request, h) {
    try {
      Logger.debug('create::payload(%s)', JSON.stringify(request.payload))
      const bulkTransferId = request.params.id
      const { bulkTransferState, completedTimestamp, extensionList } = request.payload
      const hash = Hash.generateSha256(JSON.stringify(request.payload))
      const messageId = Uuid()
      /**
       * Disabled writing to ML Object Store (bulkTransferFulfils) as it is not used:
       */
      // const BulkTransferFulfilModel = BulkTransferModels.getBulkTransferFulfilModel()
      // const doc = Object.assign({}, { messageId, headers: request.headers, bulkTransferId }, request.payload)
      // await new BulkTransferFulfilModel(doc).save()

      const IndividualTransferFulfilModel = BulkTransferModels.getIndividualTransferFulfilModel()
      await Promise.all(request.payload.individualTransferResults.map(payload => {
        new IndividualTransferFulfilModel({ messageId, bulkTransferId, payload }).save()
        return null
      }))
      const count = request.payload.individualTransferResults.length
      const message = { bulkTransferId, bulkTransferState, completedTimestamp, extensionList, count, hash }
      await TransferService.bulkFulfil(messageId, request.headers, message)
      return h.response().code(HTTPENUM.ReturnCodes.OK.CODE)
    } catch (err) {
      Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
