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

 * Georgi Georgiev <georgi.georgiev@modusbox.com> << central-services-shared
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const Facade = require('../../models/participant/facade')
/**
 * @module src/domain/participant
 */

/**
 * @function GetEndpoint
 *
 * @description It returns the endpoint for a given fsp and type from the cache if the cache is still valid, otherwise it will refresh the cache and return the value
 *
 * @param {string} fsp - the id of the fsp
 * @param {string} enpointType - the type of the endpoint
 * @param {string} transferId - optional transferId
 *
 * @returns {string} - Returns the endpoint, throws error if failure occurs
 */
const getEndpoint = async (fsp, enpointType, transferId = null) => {
  Logger.debug(`domain::participant::getEndpoint::fsp - ${fsp}`)
  Logger.debug(`domain::participant::getEndpoint::enpointType - ${enpointType}`)
  Logger.debug(`domain::participant::getEndpoint::transferId - ${transferId}`)

  try {
    return Facade.getEndpoint(fsp, enpointType, transferId)
  } catch (err) {
    Logger.error(`participantEndpointCache::getEndpoint:: ERROR:'${err}'`)
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
  }
}

module.exports = {
  getEndpoint
}
