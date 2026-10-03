const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware");
const loyaltyController=require("../controllers/customerController")
const lookupCard=require("../controllers/loyaltyCardLookUpController");
//const printController =require("../controllers/printController");
router.post(
    "/customers",
    authMiddleware,
    loyaltyController.createCustomer
);

router.get(
    "/customers/:id",
    authMiddleware,
    loyaltyController.getCustomer
);

  router.get(
    '/customers',
    authMiddleware,
    loyaltyController.getCustomers
  )
  
  router.put(
    '/customers/:id',
    authMiddleware,
    loyaltyController.updateCustomer
  )
  
  router.delete(
    '/customers/:id',
    authMiddleware,
    loyaltyController.deleteCustomer
  )
  //router.post( '/print-receipt',printController.printReceipt,)
  

module.exports=router;
