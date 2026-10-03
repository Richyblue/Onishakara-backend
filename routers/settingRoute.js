const express = require("express")
const router = express.Router()

const authMiddleware =
require("../middlewares/authMiddleware")

const {
  getSettings,
  updateSettings
} = require("../controllers/settingController")

router.get(
  "/settings",
  authMiddleware,
  getSettings
)

router.put(
  "/settings",
  authMiddleware,
  updateSettings
)

module.exports = router