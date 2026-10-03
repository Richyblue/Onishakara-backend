const { Op } = require("sequelize");
const Expense = require("../models/Expense");

/**
 * CREATE EXPENSE
 */
exports.createExpense = async (req, res) => {
    try {
        const {
            title,
            amount,
            category,
            expenseDate,
            notes
        } = req.body;

        // -----------------------------
        // Validation
        // -----------------------------
        if (!title || !String(title).trim()) {
            return res.status(400).json({
                success: false,
                message: "Expense title is required"
            });
        }

        const numericAmount = Number(amount);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Expense amount must be greater than 0"
            });
        }

        // Validate date if supplied
        let finalExpenseDate = new Date();

        if (expenseDate) {
            const parsedDate = new Date(expenseDate);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense date"
                });
            }

            finalExpenseDate = parsedDate;
        }

        // -----------------------------
        // Create Expense
        // -----------------------------
        const expense = await Expense.create({
            title: String(title).trim(),
            amount: numericAmount,
            category: category || "General",
            expenseDate: finalExpenseDate,
            notes: notes || null
        });

        return res.status(201).json({
            success: true,
            message: "Expense recorded successfully",
            expense
        });

    } catch (error) {
        console.error("CREATE EXPENSE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while creating expense",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
};


/**
 * GET ALL EXPENSES
 */
exports.getExpenses = async (req, res) => {
    try {
        const {
            search,
            category,
            startDate,
            endDate
        } = req.query;

        const where = {};

        // -----------------------------
        // Search
        // -----------------------------
        if (search && String(search).trim()) {
            where[Op.or] = [
                {
                    title: {
                        [Op.like]: `%${String(search).trim()}%`
                    }
                },
                {
                    category: {
                        [Op.like]: `%${String(search).trim()}%`
                    }
                }
            ];
        }

        // -----------------------------
        // Category
        // -----------------------------
        if (category && category !== "all") {
            where.category = category;
        }

        // -----------------------------
        // Date filter
        // -----------------------------
        if (startDate || endDate) {
            where.expenseDate = {};

            if (startDate) {
                const start = new Date(startDate);

                if (!Number.isNaN(start.getTime())) {
                    start.setHours(0, 0, 0, 0);
                    where.expenseDate[Op.gte] = start;
                }
            }

            if (endDate) {
                const end = new Date(endDate);

                if (!Number.isNaN(end.getTime())) {
                    end.setHours(23, 59, 59, 999);
                    where.expenseDate[Op.lte] = end;
                }
            }

            // Remove empty object if dates were invalid
            if (Object.keys(where.expenseDate).length === 0) {
                delete where.expenseDate;
            }
        }

        const expenses = await Expense.findAll({
            where,
            order: [
                ["expenseDate", "DESC"],
                ["createdAt", "DESC"]
            ]
        });

        // -----------------------------
        // Calculate total
        // -----------------------------
        const totalExpense = expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount || 0),
            0
        );

        return res.status(200).json({
            success: true,
            count: expenses.length,
            totalExpense: Number(totalExpense.toFixed(2)),
            expenses
        });

    } catch (error) {
        console.error("GET EXPENSES ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while fetching expenses"
        });
    }
};


/**
 * GET SINGLE EXPENSE
 */
exports.getExpense = async (req, res) => {
    try {
        const expense = await Expense.findByPk(
            req.params.id
        );

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        return res.status(200).json({
            success: true,
            expense
        });

    } catch (error) {
        console.error("GET EXPENSE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


/**
 * UPDATE EXPENSE
 */
exports.updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findByPk(
            req.params.id
        );

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        const {
            title,
            amount,
            category,
            expenseDate,
            notes
        } = req.body;

        const updateData = {};

        // -----------------------------
        // Title
        // -----------------------------
        if (title !== undefined) {
            if (!String(title).trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Expense title cannot be empty"
                });
            }

            updateData.title = String(title).trim();
        }

        // -----------------------------
        // Amount
        // -----------------------------
        if (amount !== undefined) {
            const numericAmount = Number(amount);

            if (
                !Number.isFinite(numericAmount) ||
                numericAmount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Expense amount must be greater than 0"
                });
            }

            updateData.amount = numericAmount;
        }

        // -----------------------------
        // Category
        // -----------------------------
        if (category !== undefined) {
            updateData.category =
                category || "General";
        }

        // -----------------------------
        // Expense Date
        // -----------------------------
        if (expenseDate !== undefined) {
            const parsedDate = new Date(expenseDate);

            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense date"
                });
            }

            updateData.expenseDate = parsedDate;
        }

        // -----------------------------
        // Notes
        // -----------------------------
        if (notes !== undefined) {
            updateData.notes = notes || null;
        }

        await expense.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Expense updated successfully",
            expense
        });

    } catch (error) {
        console.error("UPDATE EXPENSE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while updating expense"
        });
    }
};


/**
 * DELETE EXPENSE
 */
exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findByPk(
            req.params.id
        );

        if (!expense) {
            return res.status(404).json({
                success: false,
                message: "Expense not found"
            });
        }

        await expense.destroy();

        return res.status(200).json({
            success: true,
            message: "Expense deleted successfully"
        });

    } catch (error) {
        console.error("DELETE EXPENSE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Server error while deleting expense"
        });
    }
};