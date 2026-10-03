const express = require("express");

const router = express.Router();
const authMiddleware=require("../middlewares/authMiddleware");

const authorize=require("../middlewares/roleMiddleware");

const settingsController = require("../controllers/settingController");


// Get settings
router.get(
  "/",
  authMiddleware,

authorize("admin"),
  settingsController.getSettings
);


// Update settings
router.put(
  "/",
  authMiddleware,

authorize("admin"),
  settingsController.updateSettings
);


module.exports = router;