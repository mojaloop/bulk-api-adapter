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
 - Georgi Georgiev <georgi.georgiev@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/
'use strict'

const TransferService = require('../../../domain/bulkTransfer')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const BulkTransferModels = require('@mojaloop/central-object-store').Models.BulkTransfer
const Hash = require('@mojaloop/central-services-shared').Util.Hash
const Uuid = require('uuid4')
const Validator = require('../../../lib/validator')
const HTTPENUM = require('@mojaloop/central-services-shared').Enum.Http

/**
 * Operations on /bulkTransfers/{id}
 */
module.exports = {
  /**
   * summary: Get a transfer by Id
   * description:
   * parameters: accept, content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id
   * produces:
   * responses: default
   */
  get: async function getBulkTransfersId (request, h) {
    const { id } = request.params
    const IndividualTransferModel = BulkTransferModels.getIndividualTransferModel()
    const individualTransfers = await IndividualTransferModel
      .find({ bulkTransferId: id }, '-dataUri -_id')
      .populate('_id_bulkTransfers', 'headers -_id') // TODO in bulk-handler first get only headers, then compose each individual transfer without population
    return h.response(individualTransfers)
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
      const { validationPassed, reason } = Validator.fulfilTransfer(request)
      if (!validationPassed) {
        return h.response(reason).code(reason.errorCode)
      }

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
      }))
      const count = request.payload.individualTransferResults.length
      const message = { bulkTransferId, bulkTransferState, completedTimestamp, extensionList, count, hash }
      await TransferService.bulkFulfil(messageId, request.headers, message)
      return h.response().code(HTTPENUM.ReturnCodes.ACCEPTED.CODE)
    } catch (err) {
      Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
