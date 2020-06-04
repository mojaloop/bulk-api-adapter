'use strict'
const Mockgen = require('../../mockgen')
/**
 * Operations on /bulkTransfers/{id}/error
 */
module.exports = {
  /**
     * summary: Abort a bulk transfer
     * description:
     * parameters: content-type, date, x-forwarded-for, fspiop-source, fspiop-destination, fspiop-encryption, fspiop-signature, fspiop-uri, fspiop-http-method, id, body
     * produces:
     * responses: default
     * operationId: BulkTransfersErrorByIDPut
     */
  put: {
    default: function (req, res, callback) {
      /**
       * Using mock data generator module.
       * Replace this by actual data for the api.
       */
      Mockgen().responses({
        path: '/bulkTransfers/{id}/error',
        operation: 'put',
        response: 'default'
      }, callback)
    }
  }
}
