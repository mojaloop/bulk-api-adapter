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

 * Shashikant Hirugade <shashikant.hirugade@modusbox.com>
 * Miguel de Barros <miguel.debarros@modusbox.com>

 --------------
******/
'use strict'

const src = '../../../src'
const Test = require('tapes')(require('tape'))
const Util = require('@mojaloop/central-services-shared').Util
const Default = require('../../../config/default.json')
const Proxyquire = require('proxyquire')

Test('Config tests', configTest => {
  let sandbox
  const Sinon = require('sinon')

  configTest.beforeEach(t => {
    sandbox = Sinon.createSandbox()
    t.end()
  })

  configTest.afterEach(t => {
    sandbox.restore()
    t.end()
  })

  configTest.test('should not throw errors', test => {
    try {
      const DefaultStub = Util.clone(Default)
      const Config = Proxyquire(`${src}/lib/config`, {
        '../../config/default.json': DefaultStub
      })
      test.ok(Config)
      test.ok('pass')
    } catch (e) {
      test.fail('should throw')
    }
    test.end()
  })

  configTest.test('should pass ENV var BKAPI_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST as a string', test => {
    try {
      const DefaultStub = Util.clone(Default)
      // set env var
      const validateList = ['1']
      process.env.BKAPI_PROTOCOL_VERSIONS__CONTENT__VALIDATELIST = JSON.stringify(validateList)
      process.env.BKAPI_PROTOCOL_VERSIONS__ACCEPT__VALIDATELIST = JSON.stringify(validateList)
      const Config = Proxyquire(`${src}/lib/config`, {
        '../../config/default.json': DefaultStub
      })
      test.ok(Config)
      test.ok('pass')
      test.deepEqual(Config.PROTOCOL_VERSIONS.CONTENT.VALIDATELIST, validateList)
      test.deepEqual(Config.PROTOCOL_VERSIONS.ACCEPT.VALIDATELIST, validateList)
    } catch (e) {
      test.fail('should throw')
    }
    test.end()
  })

  configTest.end()
})
