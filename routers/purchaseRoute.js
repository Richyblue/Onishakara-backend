const express = require("express");

const {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePurchase,
  deletePurchase,
  receivePurchase,
} = require("../controllers/purchaseController");
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Purchases
|--------------------------------------------------------------------------
*/

router.post(
  "/purchases", authMiddleware,authorize("admin", "manager", "cashier"),
  createPurchase
);

router.get(
  "/purchases", authMiddleware,authorize("admin", "manager", "cashier"),
  getPurchases
);

router.get(
  "/purchases/:id", authMiddleware,authorize("admin", "manager", "cashier"),
  getPurchase
);

router.put(
  "/purchases/:id", authMiddleware,authorize("admin", "manager"),
  updatePurchase
);

router.delete(
  "/purchases/:id", authMiddleware,authorize("admin", "manager"),
  deletePurchase
);

/*
|--------------------------------------------------------------------------
| Receive Draft Purchase
|--------------------------------------------------------------------------
*/

router.put(
  "/purchases/:id/receive", authMiddleware,authorize("admin", "manager"),
  receivePurchase
);

module.exports = router;