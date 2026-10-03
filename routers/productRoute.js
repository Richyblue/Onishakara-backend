const express = require("express");
const router = express.Router();
const upload =require("../middlewares/upload");
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");
const productController= require("../controllers/productControllers");
router.post(
    "/products",
    authMiddleware,
    authorize("admin", "staff"),
    upload.single("image"),
    productController.createProduct
  );
  
  router.get(
    "/products",
    authMiddleware,
    productController.getProducts
  );
  
  router.get(
    "/products/search",
    authMiddleware,
    authorize("admin"),
    productController.searchProducts
  );
  
  router.get(
    "/products/low-stock",
    authMiddleware,
    authorize("admin"),
    productController.lowStockProducts
  );
  
  router.get(
    "/products/barcode/:barcode",
    authMiddleware,
    authorize("admin"),
    productController.getProductByBarcode
  );
  
  router.get(
    "/products/:id",
    authMiddleware,
    productController.getProduct
  );
  
  router.put(
    "/products/:id",
    authMiddleware,
    authorize("admin"),
    upload.single("image"),
    productController.updateProduct
  );
  
  router.delete(
    "/products/:id",
    authMiddleware,
    authorize("admin","staff"),
    productController.deleteProduct
  );

  router.get(
    "/products/recycle-bin",
    authMiddleware,
    productController.getDeletedProducts
  )
  
  router.put(
    "/products/restore/:id",
    authMiddleware,
    productController.restoreProduct
  )
  
  router.delete(
    "/products/permanent/:id",
    authMiddleware,
    productController.permanentDeleteProduct
  )

  module.exports=router
