const express=require("express");

const router=express.Router();

const authMiddleware=require("../middlewares/authMiddleware");

const authorize=require("../middlewares/roleMiddleware");

const returnController=require("../controllers/returnController");

router.post(

"/returns",

authMiddleware,

authorize("admin","manager"),

returnController.createReturn

);

router.get(

"/returns",

authMiddleware,

authorize("admin","manager"),

returnController.getReturns

);

router.get(

"/returns/:id",

authMiddleware,

authorize("admin","manager"),

returnController.getSingleReturn

);

router.delete(

"/returns/:id",

authMiddleware,

authorize("admin"),

returnController.deleteReturn

);

module.exports=router;
