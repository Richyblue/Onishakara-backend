const express = require("express");
const router = express.Router();
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const staffCOntroller=require("../controllers/staffController");
router.post(
    "/staff",
    authMiddleware,
    authorize("admin", "manager", "staff"),
    staffCOntroller.createStaff
  );

  router.get(
    "/staffs",
    authMiddleware,
    authorize("admin", "manager", "cashier"),
    staffCOntroller.getStaff
  );

  // Get staff QR code
router.get('/:id/qrcode', authMiddleware,
  authorize("admin", "manager"), staffCOntroller.getStaffQRCode)

/*
 Get Single Staff (For Edit)
*/
router.get(
  '/staff/:id',
  authMiddleware, authorize("admin", "manager"),
 staffCOntroller.getSingleStaff,
)

/*
 Update Staff
*/
router.put(
  '/staff/:id',
  authMiddleware,
  authorize('admin','manager'),
 staffCOntroller.updateStaff,
)

router.put(
  "/staff/:id/status",
  authMiddleware,
  authorize("admin","manager"),
  staffCOntroller.updateStaffStatus
);

  module.exports=router;
