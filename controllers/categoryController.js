const { Op } = require("sequelize");
const Category = require("../models/Category");
const Product = require("../models/Product");


// =====================================================
// CREATE CATEGORY
// =====================================================

const createCategory = async (req, res) => {
  try {
    const { name, description, image, status } = req.body;

    const categoryName = String(name || "").trim();

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const existing = await Category.findOne({
      where: {
        name: categoryName,
      },
      paranoid: false,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists",
      });
    }

    const category = await Category.create({
      name: categoryName,
      description: description
        ? String(description).trim()
        : null,
      image: image || null,
      status:
        status === "inactive"
          ? "inactive"
          : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("CREATE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create category",
    });
  }
};


// =====================================================
// GET ALL CATEGORIES
// =====================================================

const getCategories = async (req, res) => {
  try {
    const {
      search = "",
      status,
    } = req.query;

    const where = {};

    if (search.trim()) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          description: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
      ];
    }

    if (
      status === "active" ||
      status === "inactive"
    ) {
      where.status = status;
    }

    const categories = await Category.findAll({
      where,

      include: [
        {
          model: Product,
          as: "Products",
          attributes: ["id"],
          required: false,
        },
      ],

      order: [
        ["createdAt", "DESC"],
      ],
    });

    const formatted = categories.map((category) => {
      const item = category.toJSON();

      return {
        ...item,
        productCount: Array.isArray(item.Products)
          ? item.Products.length
          : 0,

        Products: undefined,
      };
    });

    return res.status(200).json({
      success: true,
      count: formatted.length,
      categories: formatted,
    });
  } catch (error) {
    console.error("GET CATEGORIES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load categories",
    });
  }
};


// =====================================================
// GET SINGLE CATEGORY
// =====================================================

const getSingleCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Product,
          as: "Products",
          attributes: [
            "id",
            "name",
            "sku",
            "sellingPrice",
            "quantity",
            "status",
          ],
          required: false,
        },
      ],
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("GET SINGLE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load category",
    });
  }
};


// =====================================================
// UPDATE CATEGORY
// =====================================================

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      image,
      status,
    } = req.body;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categoryName = String(
      name ?? category.name
    ).trim();

    if (!categoryName) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const duplicate = await Category.findOne({
      where: {
        name: categoryName,
        id: {
          [Op.ne]: id,
        },
      },
      paranoid: false,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another category already uses this name",
      });
    }

    category.name = categoryName;

    category.description =
      description !== undefined
        ? String(description).trim()
        : category.description;

    category.image =
      image !== undefined
        ? image || null
        : category.image;

    if (
      status === "active" ||
      status === "inactive"
    ) {
      category.status = status;
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update category",
    });
  }
};


// =====================================================
// TOGGLE STATUS
// =====================================================

const updateCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    category.status =
      category.status === "active"
        ? "inactive"
        : "active";

    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category ${
        category.status === "active"
          ? "activated"
          : "deactivated"
      } successfully`,
      category,
    });
  } catch (error) {
    console.error("CATEGORY STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update category status",
    });
  }
};


// =====================================================
// DELETE CATEGORY
// =====================================================

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const productCount = await Product.count({
      where: {
        categoryId: id,
      },
    });

    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This category cannot be deleted because products are assigned to it. Reassign the products first.",
        productCount,
      });
    }

    await category.destroy();

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete category",
    });
  }
};


module.exports = {
  createCategory,
  getCategories,
  getSingleCategory,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
};