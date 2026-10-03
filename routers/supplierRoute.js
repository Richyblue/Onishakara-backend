const express = require("express");

const {
  createSupplier,
  getSuppliers,
  getSupplier,
  getSupplierDetails,
  updateSupplier,
  deleteSupplier,
  getDeletedSuppliers,
  restoreSupplier,
  permanentlyDeleteSupplier,
} = require("../controllers/supplierController");
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Supplier Routes
|--------------------------------------------------------------------------
*/

// Recycle bin routes MUST come before /:id
router.get("/suppliers/recycle-bin", authMiddleware, getDeletedSuppliers);

router.put(
  "/suppliers/recycle-bin/:id/restore", authorize("admin", "manager"), authMiddleware,
  restoreSupplier
);

router.delete(
  "/suppliers/recycle-bin/:id/permanent", authorize("admin", "manager"), authMiddleware,
  permanentlyDeleteSupplier
);

// Main supplier routes
router.post("/suppliers", authMiddleware, authorize("admin", "manager"), createSupplier);

router.get("/suppliers", authMiddleware, getSuppliers);

router.get(
  "/suppliers/:id/details", authorize("admin", "manager"), authMiddleware,
  getSupplierDetails
);

router.get("/suppliers/:id", authMiddleware, getSupplier);

router.put("/suppliers/:id", authorize("admin", "manager"), authMiddleware, updateSupplier);

router.delete("/suppliers/:id", authorize("admin", "manager"), authMiddleware, deleteSupplier);

module.exports = router;