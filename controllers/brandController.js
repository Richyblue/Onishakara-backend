const { Op } = require("sequelize");
const Brand = require("../models/Brand");
const Product = require("../models/Product");


// =====================================================
// CREATE BRAND
// =====================================================

const createBrand = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      status,
    } = req.body;

    const brandName = String(name || "").trim();

    if (!brandName) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const existing = await Brand.findOne({
      where: {
        name: brandName,
      },
      paranoid: false,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A brand with this name already exists",
      });
    }

    const brand = await Brand.create({
      name: brandName,
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
      message: "Brand created successfully",
      brand,
    });
  } catch (error) {
    console.error("CREATE BRAND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create brand",
    });
  }
};


// =====================================================
// GET ALL BRANDS
// =====================================================

const getBrands = async (req, res) => {
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

    const brands = await Brand.findAll({
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

    const formatted = brands.map((brand) => {
      const item = brand.toJSON();

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
      brands: formatted,
    });
  } catch (error) {
    console.error("GET BRANDS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load brands",
    });
  }
};


// =====================================================
// GET SINGLE BRAND
// =====================================================

const getSingleBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findByPk(id, {
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

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    return res.status(200).json({
      success: true,
      brand,
    });
  } catch (error) {
    console.error("GET SINGLE BRAND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load brand",
    });
  }
};


// =====================================================
// UPDATE BRAND
// =====================================================

const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      description,
      image,
      status,
    } = req.body;

    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const brandName = String(
      name ?? brand.name
    ).trim();

    if (!brandName) {
      return res.status(400).json({
        success: false,
        message: "Brand name is required",
      });
    }

    const duplicate = await Brand.findOne({
      where: {
        name: brandName,
        id: {
          [Op.ne]: id,
        },
      },
      paranoid: false,
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another brand already uses this name",
      });
    }

    brand.name = brandName;

    brand.description =
      description !== undefined
        ? String(description).trim()
        : brand.description;

    brand.image =
      image !== undefined
        ? image || null
        : brand.image;

    if (
      status === "active" ||
      status === "inactive"
    ) {
      brand.status = status;
    }

    await brand.save();

    return res.status(200).json({
      success: true,
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    console.error("UPDATE BRAND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update brand",
    });
  }
};


// =====================================================
// TOGGLE STATUS
// =====================================================

const updateBrandStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    brand.status =
      brand.status === "active"
        ? "inactive"
        : "active";

    await brand.save();

    return res.status(200).json({
      success: true,
      message: `Brand ${
        brand.status === "active"
          ? "activated"
          : "deactivated"
      } successfully`,
      brand,
    });
  } catch (error) {
    console.error("BRAND STATUS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update brand status",
    });
  }
};


// =====================================================
// DELETE BRAND
// =====================================================

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const brand = await Brand.findByPk(id);

    if (!brand) {
      return res.status(404).json({
        success: false,
        message: "Brand not found",
      });
    }

    const productCount = await Product.count({
      where: {
        brandId: id,
      },
    });

    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "This brand cannot be deleted because products are assigned to it. Reassign the products first.",
        productCount,
      });
    }

    await brand.destroy();

    return res.status(200).json({
      success: true,
      message: "Brand deleted successfully",
    });
  } catch (error) {
    console.error("DELETE BRAND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete brand",
    });
  }
};


module.exports = {
  createBrand,
  getBrands,
  getSingleBrand,
  updateBrand,
  updateBrandStatus,
  deleteBrand,
};