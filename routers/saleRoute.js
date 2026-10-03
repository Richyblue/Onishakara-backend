const express = require("express");

const router = express.Router();

const {
  createPOSSale,
  getSales,
  getSale,
  getSaleByReceipt,
  getTodaySalesSummary,
  getSalesSummary,
  getCashierSalesSummary,
  getProductSalesSummary,
} = require("../controllers/saleController");
const authMiddleware = require("../middlewares/authMiddleware");


// ============================================================
// POS SALE
// ============================================================

router.post(
  "/sales", authMiddleware,
  createPOSSale
);


// ============================================================
// SALES REPORTS / SUMMARIES
// IMPORTANT: specific routes come BEFORE /sales/:id
// ============================================================

router.get(
  "/sales/today-summary", authMiddleware,
  getTodaySalesSummary
);

router.get(
  "/sales/summary", authMiddleware,
  getSalesSummary
);

router.get(
  "/sales/cashiers", authMiddleware,
  getCashierSalesSummary
);

router.get(
  "/sales/products", authMiddleware,
  getProductSalesSummary
);


// ============================================================
// SALE LIST
// ============================================================

router.get(
  "/sales", authMiddleware,
  getSales
);


// ============================================================
// SALE BY RECEIPT
// ============================================================

router.get(
  "/sales/receipt/:receiptNumber", authMiddleware,
  getSaleByReceipt
);


// ============================================================
// SINGLE SALE
// ============================================================

router.get(
  "/sales/:id", authMiddleware,
  getSale
);


module.exports = router;