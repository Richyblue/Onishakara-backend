const express = require("express");

const router = express.Router();

const posController =
require("../controllers/posController");
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware =
require("../middlewares/authMiddleware");

/*
 Create POS Sale
*/

router.post(
  "/sales",
  authMiddleware,
  authorize("cashier", "admin", "manager", "staff"),
  posController.createPOSSale
);

module.exports = 
router;