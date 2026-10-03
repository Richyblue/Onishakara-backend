const express = require('express')

const router = express.Router()

const authMiddleware =
require('../middlewares/authMiddleware')

const commissionTable =
require('../controllers/commissionController')

router.get(
    '/commissions',
    authMiddleware,
    commissionTable.getCommissions,
  )
  
  router.put(
    '/commissions/:id/pay',
    authMiddleware,
    commissionTable.markAsPaid,
  )
  router.put(
    '/commissions/pay-bulk',
    authMiddleware,
    commissionTable.bulkMarkAsPaid
  )

  module.exports=router;