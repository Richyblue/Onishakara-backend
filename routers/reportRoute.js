const express = require("express");
const router = express.Router()
const reportController =
require('../controllers/reportController')
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

router.get(
    '/report',
    authMiddleware, authorize("admin", "manager"),
    reportController.getSalesReport
  )

router.get(
  '/reports/my-sales',
  authMiddleware, authorize("admin", "manager"),
  reportController.mySalesReport
)

router.get(
  '/report/:id',
  authMiddleware, authorize("admin", "manager"),
  reportController.getSingleSale
)

module.exports=router;
