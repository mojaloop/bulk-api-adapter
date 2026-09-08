/*****
 License
 --------------
 Copyright © 2020-2026 Mojaloop Foundation
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
 --------------
 ******/

'use strict'

const OpenapiBackend = require('@mojaloop/central-services-shared').Util.OpenapiBackend
const BulkTransfers = require('./bulkTransfers')
const BulkTransfersById = require('./bulkTransfers/{id}')
const BulkTransfersErrorById = require('./bulkTransfers/{id}/error')
const EndpointCache = require('./endpointcache')
const Health = require('./health')
const Metrics = require('./metrics')

/**
 * Map of OpenAPI operationIds to handler functions, used by OpenapiBackend to
 * route validated requests. Handler signature is (context, request, h).
 */
module.exports = {
  EndpointCache: EndpointCache.delete,
  getHealth: (context, request, h) => Health.get(request, h),
  getMetrics: Metrics.get,
  getBulkTransfersId: BulkTransfersById.get,
  BulkTransfersByIDPut: BulkTransfersById.put,
  postBulkTransfers: BulkTransfers.post,
  BulkTransfersErrorByIDPut: BulkTransfersErrorById.put,
  validationFail: OpenapiBackend.validationFail,
  notFound: OpenapiBackend.notFound,
  methodNotAllowed: OpenapiBackend.methodNotAllowed
}
