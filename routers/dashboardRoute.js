const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

const getDashboard = require("../controllers/dashboardController");

router.get(
    "/dashboard",
    authMiddleware,
    authorize("admin", "manager"),
    getDashboard
);

module.exports = router;