const express = require("express");

const router = express.Router();

const {
  getStock,
  getStockSummary,
  getLowStock,
  getOutOfStock,
  adjustStock,
  getStockHistory,
  getProductStockHistory,
} = require("../controllers/stockController");
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");


// Inventory dashboard
router.get("/stock/summary", authMiddleware, getStockSummary);


// Stock lists
router.get("/stock", authMiddleware, getStock);

router.get("/stock/low-stock", authMiddleware, getLowStock);

router.get("/stock/out-of-stock", authMiddleware, getOutOfStock);


// Stock adjustment
router.patch("/stock/:productId", authMiddleware, authorize("admin", "manager"), adjustStock);


// Stock history
router.get("/stock/history", authMiddleware, getStockHistory);

router.get(
  "/stock/:productId/history", authMiddleware,
  getProductStockHistory
);


module.exports = router;