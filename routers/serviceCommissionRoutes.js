const express = require('express')

const router = express.Router()

const {
  getServiceCommissions,
  getServiceCommission,
  createOrUpdateServiceCommission,
  deleteServiceCommission,
  toggleServiceCommission,
} = require('../controllers/commission/serviceCommissionController')

const authMiddleware = require('../middlewares/authMiddleware')
const authorize =require("../middlewares/roleMiddleware");

// ==========================================
// GET ALL COMMISSION SETTINGS
// ==========================================

router.get(
  '/',
  authMiddleware,
  authorize("admin", "manager"),
  getServiceCommissions,
)

// ==========================================
// GET COMMISSION FOR ONE SERVICE
// ==========================================

router.get(
  '/:serviceId',
  authMiddleware,
  authorize("admin", "manager"),
  getServiceCommission,
)

// ==========================================
// CREATE / UPDATE
// ==========================================

router.post(
  '/',
  authMiddleware,
  authorize("admin", "manager"),
  createOrUpdateServiceCommission,
)

// ==========================================
// DELETE CUSTOM COMMISSION
// ==========================================

router.delete(
  '/:serviceId',
  authMiddleware,
  authorize("admin", "manager"),
  deleteServiceCommission,
)

// ==========================================
// ENABLE / DISABLE
// ==========================================

router.patch(
  '/:serviceId/toggle',
  authMiddleware,
  authorize("admin", "manager"),
  toggleServiceCommission,
)

module.exports = router