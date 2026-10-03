const express = require("express");

const router = express.Router();

const authMiddleware =require("../middlewares/authMiddleware");
const heldSalesController=require("../controllers/heldController");

router.post(
  "/",
  authMiddleware,
  heldSalesController.createHeldSale
);

router.get(
  "/",
  authMiddleware,
  heldSalesController.getHeldSales
);
 
router.put(
  "/restore/:id",
  authMiddleware,
  heldSalesController.restoreHeldSale 
);

router.delete(
  "/:id",
  authMiddleware,
  heldSalesController.deleteHeldSale
);

//router.post('/held-sales/sync',syncHeldSale);

module.exports = router;
