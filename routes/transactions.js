
import express from "express";
import { Transaction } from "../models/Transaction.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all transactions
router.get("/", async (req, res) => {
  try {
    const { type, category, startDate, endDate, limit = 1000 } = req.query;

    const filters = {
      type,
      category,
      startDate,
      endDate,
      limit: parseInt(limit),
    };

    // Remove undefined values
    Object.keys(filters).forEach(
      (key) => filters[key] === undefined && delete filters[key]
    );

    const transactionModel = new Transaction(req.db);
    const transactions = await transactionModel.findByUserId(
      req.user.id,
      filters
    );

    res.json({ transactions });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
});

// Get transaction statistics
router.get("/statistics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const transactionModel = new Transaction(req.db);
    const statistics = await transactionModel.getStatistics(
      req.user.id,
      filters
    );

    // Format statistics
    const stats = {
      income: { total: 0, count: 0, categories: [] },
      expense: { total: 0, count: 0, categories: [] },
      balance: 0,
    };

    statistics.forEach((stat) => {
      if (stat._id === "income") {
        stats.income = {
          total: stat.total,
          count: stat.count,
          categories: stat.categories,
        };
      } else if (stat._id === "expense") {
        stats.expense = {
          total: stat.total,
          count: stat.count,
          categories: stat.categories,
        };
      }
    });

    stats.balance = stats.income.total - stats.expense.total;

    res.json({ statistics: stats });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

// Get category breakdown
router.get("/categories/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { startDate, endDate } = req.query;

    if (!["income", "expense"].includes(type)) {
      return res
        .status(400)
        .json({ message: "Invalid type. Must be income or expense" });
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const transactionModel = new Transaction(req.db);
    const breakdown = await transactionModel.getCategoryBreakdown(
      req.user.id,
      type,
      filters
    );

    res.json({ breakdown });
  } catch (error) {
    console.error("Get category breakdown error:", error);
    res.status(500).json({ message: "Failed to fetch category breakdown" });
  }
});

// Get single transaction
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const transactionModel = new Transaction(req.db);
    const transaction = await transactionModel.findById(id, req.user.id);

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ transaction });
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ message: "Failed to fetch transaction" });
  }
});

// Create transaction
router.post("/", async (req, res) => {
  try {
    const { type, amount, category, subcategory, description, date } = req.body;

    // Validation
    if (!type || !amount || !category || !date) {
      return res.status(400).json({
        message: "Type, amount, category, and date are required",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Type must be income or expense",
      });
    }

    if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        message: "Amount must be a positive number",
      });
    }

    const transactionData = {
      userId: req.user.id,
      type,
      amount: parseFloat(amount),
      category: category.trim(),
      subcategory: subcategory?.trim(),
      description: description?.trim(),
      date: new Date(date),
    };

    const transactionModel = new Transaction(req.db);
    const transaction = await transactionModel.create(transactionData);

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ message: "Failed to create transaction" });
  }
});

// Update transaction
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, category, subcategory, description, date } = req.body;

    // Validation
    if (type && !["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Type must be income or expense",
      });
    }

    if (
      amount !== undefined &&
      (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
    ) {
      return res.status(400).json({
        message: "Amount must be a positive number",
      });
    }

    const updateData = {};
    if (type) updateData.type = type;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category) updateData.category = category.trim();
    if (subcategory !== undefined) updateData.subcategory = subcategory?.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (date) updateData.date = new Date(date);

    const transactionModel = new Transaction(req.db);
    const updated = await transactionModel.update(id, req.user.id, updateData);

    if (!updated) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction updated successfully" });
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ message: "Failed to update transaction" });
  }
});

// Delete transaction
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const transactionModel = new Transaction(req.db);
    const deleted = await transactionModel.delete(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ message: "Failed to delete transaction" });
  }
});

export default router;