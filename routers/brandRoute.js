const express = require("express");

const router = express.Router();

const {
  createBrand,
  getBrands,
  getSingleBrand,
  updateBrand,
  updateBrandStatus,
  deleteBrand,
} = require("../controllers/brandController");

const authMiddleware = require("../middlewares/authMiddleware");
const authorize =require("../middlewares/roleMiddleware");

router.post(
  "/brands",
  authMiddleware,
  createBrand
);

router.get(
  "/brands",
  authMiddleware,
  getBrands
);

router.get(
  "/brands/:id",
  authMiddleware,
  getSingleBrand
);

router.put(
  "/brands/:id",
  authMiddleware,
  updateBrand
);

router.put(
  "/brands/:id/status",
  authMiddleware,
  updateBrandStatus
);

router.delete(
  "/brands/:id",
  authMiddleware, authorize("admin", "manager"),
  deleteBrand
);

module.exports = router;