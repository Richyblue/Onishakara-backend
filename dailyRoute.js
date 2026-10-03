const express = require('express')

const router = express.Router()

const authMiddleware = require(
  '../middleware/authMiddleware',
)

const reportController = require(
  '../controllers/reportController',
)

router.get(
  '/my-daily-report',
  authMiddleware,
  reportController.getMyDailyReport,
)

module.exports = router
