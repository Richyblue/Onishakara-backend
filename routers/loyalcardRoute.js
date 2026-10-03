const express = require('express')

const router = express.Router()

const authMiddleware =
require('../middlewares/authMiddleware')

const loyaltyCardController =
require('../controllers/loyaltyController')

router.get(
  '/loyalty-cards',
  authMiddleware,
  loyaltyCardController.getLoyaltyCards,
)

router.put(
  '/loyalty-cards/:id/status',
  authMiddleware,
  loyaltyCardController.updateStatus,
)

module.exports = router