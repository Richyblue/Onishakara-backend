const express = require("express");

const router = express.Router();

const businessHoursController = require("../controllers/businessHoursController");

router.get(
  "/",
  businessHoursController.getBusinessHours
);

router.put(
  "/",
  businessHoursController.updateBusinessHours
);

module.exports = router;