const express = require('express')

const router = express.Router()
const authMiddleware=require("../middlewares/authMiddleware");

const authorize=require("../middlewares/roleMiddleware");
const attendanceController =
  require('../controllers/attendanceController')


// Dashboard KPIs
router.get(
  '/dashboard',authMiddleware,

  authorize("admin","manager"),
  attendanceController.getDashboardKPIs,
)


// Today's attendance
router.get(
  '/today', authMiddleware,

  authorize("admin","manager"),
  attendanceController.getTodayAttendance,
)


// Staff activity log
router.get(
  '/activities',
  authMiddleware,

  authorize("admin","manager"),
  attendanceController.getStaffActivities,
)


// Individual staff history
router.get(
  '/staff/:staffId',
  authMiddleware,

  authorize("admin","manager"),
  attendanceController.getStaffAttendanceHistory,
)


module.exports = router