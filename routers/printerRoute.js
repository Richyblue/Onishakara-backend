const express = require('express')

const router = express.Router()

const printController = require('../controllers/printController')
const authMiddleware = require('../middlewares/authMiddleware')
const reprintController =require('../controllers/reprintController')

router.post(
  '/print-receipt',
  printController.printReceipt,
)


router.get(
  '/sales/:id/reprints',
  authMiddleware,
  reprintController.reprintReceipt,
)
module.exports = router
