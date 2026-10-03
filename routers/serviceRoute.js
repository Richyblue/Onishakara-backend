const express = require('express')
const router = express.Router()

const authMiddleware = require('../middlewares/authMiddleware')
const authorize =require("../middlewares/roleMiddleware");
const serviceController =
require('../controllers/serviceController')

router.post(
  '/services',
  authMiddleware,
  serviceController.createService
)

router.get(
  '/servicess',
  authMiddleware,
authorize("admin", "manager", "cashier"),
  serviceController.getServices
)

router.get(
  '/services/:id',
  authMiddleware,
  serviceController.getService
)

router.put(
  '/services/:id',
  authMiddleware,
  serviceController.updateService
)

router.delete(
  '/services/:id',
  authMiddleware,
  serviceController.deleteService
)

module.exports = router
