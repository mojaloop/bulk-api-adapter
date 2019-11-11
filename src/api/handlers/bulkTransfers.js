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
 - Miguel de Barros <miguel.debarros@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>
 --------------
 ******/
'use strict'

const TransferService = require('../../domain/bulkTransfer')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const BulkTransferModels = require('@mojaloop/central-object-store').Models.BulkTransfer
const Hash = require('@mojaloop/central-services-shared').Util.Hash
const Uuid = require('uuid4')
const HTTPENUM = require('@mojaloop/central-services-shared').Enum.Http

/**
 * Operations on /bulkTransfers
 */
module.exports = {
  /**
   * summary: Transfer API.
   * description:
   * parameters: accept, content-type, content-length, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, body
   * produces:
   * responses: default
   */
  post: async function postBulkTransfers (request, h) {
    try {
      Logger.debug('create::payload(%s)', JSON.stringify(request.payload))
      const { bulkTransferId, bulkQuoteId, payerFsp, payeeFsp, expiration, extensionList } = request.payload
      const hash = Hash.generateSha256(JSON.stringify(request.payload))
      const messageId = Uuid()
      /**
       * Disabled writing to ML Object Store (bulkTransfers) as it is not used:
       */
      // const BulkTransferModel = BulkTransferModels.getBulkTransferModel()
      // const doc = Object.assign({}, { messageId, headers: request.headers }, request.payload)
      // await new BulkTransferModel(doc).save()

      const IndividualTransferModel = BulkTransferModels.getIndividualTransferModel()
      await Promise.all(request.payload.individualTransfers.map(payload => {
        return new IndividualTransferModel({ messageId, payload }).save()
      }))
      const message = { bulkTransferId, bulkQuoteId, payerFsp, payeeFsp, expiration, extensionList, hash }
      await TransferService.bulkPrepare(messageId, request.headers, message)
      return h.response().code(HTTPENUM.ReturnCodes.ACCEPTED.CODE)
    } catch (err) {
      Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
