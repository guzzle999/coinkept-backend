import express from "express";
import { Category } from "../models/Category.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all categories
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    const categoryModel = new Category(req.db);
    const categories = await categoryModel.findByUserId(req.user.id, type);

    res.json({ categories });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
});

// Get single category
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const categoryModel = new Category(req.db);
    const category = await categoryModel.findById(id, req.user.id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.json({ category });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ message: "Failed to fetch category" });
  }
});

// Create category
router.post("/", async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    // Validation
    if (!name || !type) {
      return res.status(400).json({
        message: "Name and type are required",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Type must be income or expense",
      });
    }

    if (name.trim().length === 0) {
      return res.status(400).json({
        message: "Category name cannot be empty",
      });
    }

    const categoryData = {
      userId: req.user.id,
      name: name.trim(),
      type,
      color: color || "#6366f1",
      icon: icon || "📊",
    };

    const categoryModel = new Category(req.db);

    // Check if category name already exists for user
    const existingCategories = await categoryModel.findByUserId(
      req.user.id,
      type
    );
    const nameExists = existingCategories.some(
      (cat) => cat.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (nameExists) {
      return res.status(409).json({
        message: "Category name already exists",
      });
    }

    const category = await categoryModel.create(categoryData);

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ message: "Failed to create category" });
  }
});

// Update category
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, icon } = req.body;

    if (name && name.trim().length === 0) {
      return res.status(400).json({
        message: "Category name cannot be empty",
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (color) updateData.color = color;
    if (icon) updateData.icon = icon;

    const categoryModel = new Category(req.db);

    // If updating name, check if it already exists
    if (name) {
      const category = await categoryModel.findById(id, req.user.id);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }

      const existingCategories = await categoryModel.findByUserId(
        req.user.id,
        category.type
      );
      const nameExists = existingCategories.some(
        (cat) =>
          cat.name.toLowerCase() === name.trim().toLowerCase() &&
          cat._id.toString() !== id
      );

      if (nameExists) {
        return res.status(409).json({
          message: "Category name already exists",
        });
      }
    }

    const updated = await categoryModel.update(id, req.user.id, updateData);

    if (!updated) {
      return res
        .status(404)
        .json({ message: "Category not found or cannot be updated" });
    }

    res.json({ message: "Category updated successfully" });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ message: "Failed to update category" });
  }
});

// Delete category
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const categoryModel = new Category(req.db);
    const deleted = await categoryModel.delete(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({
        message: "Category not found or cannot be deleted",
      });
    }

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

export default router;
