const express = require("express");
const router = express.Router();
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const recycleController=require("../controllers/recycleController");
router.get(
    '/products/recycle-bin',
    authMiddleware,
    authorize("admin"),
    recycleController.getDeletedProducts
  );
  
  router.put(
    '/products/restore/:id',
    authMiddleware,
    authorize("admin"),
    recycleController.restoreProduct
  );
  
  router.delete(
    '/products/permanent/:id',
    authMiddleware,
    authorize("admin"),
    recycleController.forceDeleteProduct
  );

  module.exports=router;