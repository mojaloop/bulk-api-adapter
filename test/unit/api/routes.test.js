'use strict'

const Test = require('tape')
const Routes = require('../../../src/api/routes')

const operation = (method, path, operationId) => ({ method, path, operationId })

Test('assertHandlersRegistered accepts a fully wired api', function (test) {
  const api = {
    getOperations: () => [operation('get', '/health', 'getHealth')],
    handlers: { getHealth: () => {} }
  }
  test.doesNotThrow(() => Routes.assertHandlersRegistered(api), 'no error is thrown')
  test.end()
})

Test('assertHandlersRegistered throws naming operations with no handler', function (test) {
  const api = {
    getOperations: () => [
      operation('get', '/health', 'getHealth'),
      operation('post', '/bulkTransfers', 'postBulkTransfers'),
      operation('get', '/unnamed', undefined)
    ],
    handlers: { getHealth: () => {} }
  }

  try {
    Routes.assertHandlersRegistered(api)
    test.fail('expected assertHandlersRegistered to throw')
  } catch (err) {
    test.ok(err.message.includes('POST /bulkTransfers (operationId: postBulkTransfers)'), 'the unhandled operation is named')
    test.ok(err.message.includes('GET /unnamed (operationId: undefined)'), 'an operation with no operationId is reported')
    test.notOk(err.message.includes('/health'), 'the handled operation is not reported')
  }
  test.end()
})
