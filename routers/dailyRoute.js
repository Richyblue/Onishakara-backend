const express = require('express')

const router = express.Router()

const authMiddleware = require(
  '../middlewares/authMiddleware',
)

const reportControllers = require(
  '../controllers/dailyController',
)

router.get(
  '/my-daily-report',
  authMiddleware,
  reportControllers.getMyDailyReport,
)

module.exports = router
