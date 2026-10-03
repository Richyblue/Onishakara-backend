const express = require("express");

const router = express.Router();

const {
    createExpense,
    getExpenses,
    getExpense,
    updateExpense,
    deleteExpense
} = require("../controllers/expenseController");
const authorize =require("../middlewares/roleMiddleware");
const authMiddleware = require("../middlewares/authMiddleware");

router.post("/expenses", authMiddleware, authorize("admin", "manager"), createExpense);

router.get("/expenses", authMiddleware, getExpenses);

router.get("/expenses/:id", authMiddleware, getExpense);

router.put("/expenses/:id", authorize("admin", "manager"), authMiddleware, updateExpense);

router.delete("/expenses/:id", authorize("admin", "manager"), authMiddleware, deleteExpense);

module.exports = router;