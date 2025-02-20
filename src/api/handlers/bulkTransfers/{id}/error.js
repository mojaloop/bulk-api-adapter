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

 * ModusBox
 - Steven Oderayi <steven.oderayi@modusbox.com>
 --------------
 ******/

'use strict'

const TransferService = require('../../../../domain/bulkTransfer')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Hash = require('@mojaloop/central-services-shared').Util.Hash
const Uuid = require('uuid4')
const HTTPENUM = require('@mojaloop/central-services-shared').Enum.Http
const BulkTransferModels = require('@mojaloop/object-store-lib').Models.BulkTransfer

/**
 * Operations on /bulkTransfers/{id}/error
 */
module.exports = {
  /**
     * summary: Handles bulk transfer error callback
     * description: If the server is unable to find or create a bulk transfer, or another processing error occurs, the error callback PUT /bulkTransfers/<ID>/error is used. The <ID> in the URI should contain the bulkTransferId that was used for the creation request of the bulk transfer (POST /bulkTransfers), or the <ID> that was used in the GET /bulkTransfers/<ID>.
     * parameters: id, body, Content-Length, Content-Type, Date, X-Forwarded-For, FSPIOP-Source, FSPIOP-Destination, FSPIOP-Encryption, FSPIOP-Signature, FSPIOP-URI, FSPIOP-HTTP-Method
     * produces: application/json
     * responses: default
     */
  put: async function putBulkTransferErrorById (request, h) {
    try {
      Logger.debug('error::payload(%s)', JSON.stringify(request.payload))

      const bulkTransferId = request.params.id
      const { errorInformation, extensionList } = request.payload
      const hash = Hash.generateSha256(JSON.stringify(request.payload))
      const messageId = Uuid()
      const message = { bulkTransferId, errorInformation, extensionList, hash }

      const IndividualTransferFulfilModel = BulkTransferModels.getIndividualTransferFulfilModel()
      await new IndividualTransferFulfilModel({ messageId, bulkTransferId, payload: request.payload }).save()
      await TransferService.bulkTransferError(messageId, request.headers, message)

      return h.response().code(HTTPENUM.ReturnCodes.OK.CODE)
    } catch (err) {
      Logger.error(err)
      throw ErrorHandler.Factory.reformatFSPIOPError(err)
    }
  }
}
