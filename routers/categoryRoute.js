const express = require("express");

const router = express.Router();

const {
  createCategory,
  getCategories,
  getSingleCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
} = require("../controllers/categoryController");

const authMiddleware = require("../middlewares/authMiddleware");
const authorize =require("../middlewares/roleMiddleware");

router.post(
  "/categories",
  authMiddleware,
  createCategory
);

router.get(
  "/categories",
  authMiddleware,
  getCategories
);

router.get(
  "/categories/:id",
  authMiddleware,
  getSingleCategory
);

router.put(
  "/categories/:id",
  authMiddleware,
  updateCategory
);

router.put(
  "/categories/:id/status",
  authMiddleware,
  updateCategoryStatus
);

router.delete(
  "/categories/:id",
  authMiddleware, authorize("admin", "manager"),
  deleteCategory
);

module.exports = router;