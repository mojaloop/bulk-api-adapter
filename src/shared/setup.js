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
 - Shashikant Hiruagde <shashikant.hirugade@modusbox.com>
 - Valentin Genev <valentin.genev@modusbox.com>
 - Miguel de Barros <miguel.debarros@modusbox.com>
 --------------
 ******/

'use strict'

const Plugins = require('./plugins')
const Hapi = require('@hapi/hapi')
const Logger = require('@mojaloop/central-services-logger')
const ErrorHandler = require('@mojaloop/central-services-error-handling')
const RegisterHandlers = require('../handlers/register')
const Config = require('../lib/config')
const ParticipantEndpointCache = require('../domain/participant/lib/cache/participantEndpoint')
const Metrics = require('@mojaloop/central-services-metrics')
const ObjStoreDb = require('@mojaloop/object-store-lib').Db
const MongoUriBuilder = require('mongo-uri-builder')

/**
 * @module src/shared/setup
 */

/**
 * @function createServer
 *
 * @description Create HTTP Server
 *
 * @param {number} port Port to register the Server against
 * @param modules list of Modules to be registered
 * @returns {Promise<Server>} Returns the Server object
 */

const connectMongoose = async () => {
  try {
    const connectionString = MongoUriBuilder({
      username: encodeURIComponent(Config.MONGODB_USER),
      password: encodeURIComponent(Config.MONGODB_PASSWORD),
      host: Config.MONGODB_HOST,
      port: Config.MONGODB_PORT,
      database: Config.MONGODB_DATABASE
    })

    Logger.debug(`Connecting to MongoDB ${Config.MONGODB_HOST}:${Config.MONGODB_PORT}`)

    return ObjStoreDb.connect(connectionString)
  } catch (err) {
    throw ErrorHandler.Factory.reformatFSPIOPError(err)
    // TODO: review as code is being changed from returning null to returning a FSPIOPError
    // Logger.error(`error - ${err}`)
    // return null
  }
}

const createServer = async (port, modules) => {
  const server = new Hapi.Server({
    port,
    routes: {
      validate: {
        failAction: async (request, h, err) => {
          throw ErrorHandler.Factory.reformatFSPIOPError(err)
        }
      },
      payload: {
        parse: true,
        output: 'stream'
      }
    }
  })
  const db = await connectMongoose()
  server.app.db = db

  await Plugins.registerPlugins(server)
  await server.register(modules)
  await server.start()
  Logger.debug(`Server running at: ${server.info.uri}`)
  return server
}

/**
 * @function createHandlers
 *
 * @description Create method to register specific Handlers specified by the Module list as part of the Setup process
 *
 * @typedef handler
 * @type {Object}
 * @property {string} type The type of Handler to be registered
 * @property {boolean} enabled True|False to indicate if the Handler should be registered
 * @property {string[]} [fspList] List of FSPs to be registered
 *
 * @param {handler[]} handlers List of Handlers to be registered
 * @returns {Promise<boolean>} Returns true if Handlers were registered
 */
const createHandlers = async (handlers) => {
  let handlerIndex
  const registerdHandlers = {
    connection: {},
    register: {},
    ext: {},
    start: new Date(),
    info: {},
    handlers
  }

  for (handlerIndex in handlers) {
    const handler = handlers[handlerIndex]
    let error
    if (handler.enabled) {
      Logger.info(`Handler Setup - Registering ${JSON.stringify(handler)}!`)
      switch (handler.type) {
        case 'notification':
          await ParticipantEndpointCache.initializeCache()
          await RegisterHandlers.registerNotificationHandler()
          break
        default:
          error = `Handler Setup - ${JSON.stringify(handler)} is not a valid handler to register!`
          Logger.error(error)
          throw ErrorHandler.Factory.reformatFSPIOPError(error)
      }
    }
  }

  return registerdHandlers
}

const initializeInstrumentation = () => {
  if (!Config.INSTRUMENTATION_METRICS_DISABLED) {
    Metrics.setup(Config.INSTRUMENTATION_METRICS_CONFIG)
  }
}

/**
 * @function initialize
 *
 * @description Setup method for API, Admin and Handlers. Note that the Migration scripts are called before connecting to the database to ensure all new tables are loaded properly.
 *
 * @typedef handler
 * @type {Object}
 * @property {string} type The type of Handler to be registered
 * @property {boolean} enabled True|False to indicate if the Handler should be registered
 * @property {string[]} [fspList] List of FSPs to be registered
 *
 * @param {string} service Name of service to start. Available choices are 'api', 'admin', 'handler'
 * @param {number} port Port to start the HTTP Server on
 * @param {object[]} modules List of modules to be loaded by the HTTP Server
 * @param {boolean} runMigrations True to run Migration script, false to ignore them, only applicable for service types that are NOT 'handler'
 * @param {boolean} runHandlers True to start Handlers, false to ignore them
 * @param {handler[]} handlers List of Handlers to be registered
 * @returns {object} Returns HTTP Server object
 */
const initialize = async function ({ service, port, modules = [], runHandlers = false, handlers = [] }) {
  let server
  initializeInstrumentation()
  switch (service) {
    case 'api':
      server = await createServer(port, modules)
      break
    case 'handler':
      if (!Config.HANDLERS_API_DISABLED) {
        server = await createServer(port, modules)
      }
      break
    default:
      Logger.error(`No valid service type ${service} found!`)
      throw ErrorHandler.Factory.createFSPIOPError(ErrorHandler.Enums.FSPIOPErrorCodes.VALIDATION_ERROR, `No valid service type ${service} found!`)
  }
  if (runHandlers) {
    if (Array.isArray(handlers) && handlers.length > 0) {
      await createHandlers(handlers)
    } else {
      await ParticipantEndpointCache.initializeCache()
      await RegisterHandlers.registerAllHandlers()
    }
  }

  return server
}

module.exports = {
  initialize,
  createServer
}
