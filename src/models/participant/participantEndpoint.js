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

 * Georgi Georgiev <georgi.georgiev@modusbox.com> << central-services-shared
 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 --------------
 ******/

'use strict'

const Logger = require('@mojaloop/central-services-logger')
const Config = require('../../lib/config')
const Mustache = require('mustache')
// const request = require('request')
const axios = require('axios')

/**
 * @module src/models/participant
 */

/**
* @function getEndpoint
*
 * @description This returns fetches the endpoints from a remote URI, so that it will can be cached in ml-api-adapter
 *
 * @param {string} fsp The fsp id
 * @returns {object} endpointMap Returns the object containing the endpoints for given fsp id
 */

const getEndpoint = async (fsp) => {
  const url = Mustache.render(Config.ENDPOINT_SOURCE_URL, { fsp })
  const requestOptions = {
    url,
    method: 'get',
    httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) // Equivalent to `agentOptions` in `request`
  }
  Logger.debug(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := fetching the endpoints from the resource with options: ${JSON.stringify(requestOptions)}`)

  try {
    const response = await axios(requestOptions)
    const endpoints = response.data // Axios automatically parses JSON responses
    const endpointMap = {}

    if (Array.isArray(endpoints)) {
      endpoints.forEach(item => {
        endpointMap[item.type] = item.value
      })
    }

    Logger.info(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := successful with body: ${JSON.stringify(endpoints)}`)
    Logger.debug(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := successful with response: ${JSON.stringify(response)}`)
    Logger.debug(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoints := Returning the endpoints: ${JSON.stringify(endpointMap)}`)

    return endpointMap
  } catch (error) {
    Logger.error(`[fsp=${fsp}] ~ Model::participantEndpoint::getEndpoint := failed with error: ${error.message}`)
    throw error
  }
}
module.exports = {
  getEndpoint
}
