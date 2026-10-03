const { Op } = require("sequelize");
const sequelize = require("../config/db");

const {
  Product,
  ProductVariant,
  Category,
  Brand,
  StockMovement,
  User,
} = require("../models");

/**
 * GET STOCK LIST
 * GET /api/v1/stock
 */
const getStock = async (req, res) => {
  try {
    const {
      search = "",
      categoryId,
      brandId,
      status = "active",
      stockStatus,
      page = 1,
      limit = 50,
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.min(
      Math.max(parseInt(limit, 10) || 50, 1),
      500
    );

    const offset = (pageNumber - 1) * limitNumber;

    const where = {};

    if (status !== "all") {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    if (search.trim()) {
      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          sku: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          barcode: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
      ];
    }

    if (stockStatus === "out") {
      where.quantity = {
        [Op.lte]: 0,
      };
    }

    if (stockStatus === "low") {
      where.quantity = {
        [Op.gt]: 0,
        [Op.lte]: sequelize.col("reorderLevel"),
      };
    }

    if (stockStatus === "in_stock") {
      where.quantity = {
        [Op.gt]: 0,
      };
    }

    const { count, rows } = await Product.findAndCountAll({
      where,

      include: [
        {
          model: Category,
          as: "Category",
          required: false,
        },
        {
          model: Brand,
          as: "Brand",
          required: false,
        },
        {
          model: ProductVariant,
          as: "Variants",
          required: false,
        },
      ],

      order: [["name", "ASC"]],

      limit: limitNumber,
      offset,
      distinct: true,
    });

    const products = rows.map((product) => {
      const item = product.toJSON();

      const variants = Array.isArray(item.Variants)
        ? item.Variants
        : [];

      const variantQuantity = variants.reduce(
        (total, variant) =>
          total + Number(variant.quantity || 0),
        0
      );

      return {
        ...item,

        variantQuantity,

        totalAvailableQuantity:
          variants.length > 0
            ? variantQuantity
            : Number(item.quantity || 0),

        stockStatus:
          Number(item.quantity || 0) <= 0
            ? "out"
            : Number(item.quantity || 0) <=
              Number(item.reorderLevel || 0)
            ? "low"
            : "in_stock",
      };
    });

    return res.json({
      success: true,

      data: products,

      pagination: {
        total: count,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(count / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock.",
      error: error.message,
    });
  }
};


/**
 * GET INVENTORY SUMMARY
 * GET /api/v1/stock/summary
 */
const getStockSummary = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        status: "active",
      },

      attributes: [
        "id",
        "quantity",
        "reorderLevel",
        "costPrice",
        "sellingPrice",
      ],
    });

    let totalProducts = products.length;
    let totalUnits = 0;
    let inventoryCostValue = 0;
    let inventoryRetailValue = 0;
    let lowStock = 0;
    let outOfStock = 0;
    let inStock = 0;

    products.forEach((product) => {
      const quantity = Number(product.quantity || 0);
      const reorderLevel = Number(product.reorderLevel || 0);
      const costPrice = Number(product.costPrice || 0);
      const sellingPrice = Number(product.sellingPrice || 0);

      totalUnits += quantity;

      inventoryCostValue += quantity * costPrice;

      inventoryRetailValue += quantity * sellingPrice;

      if (quantity <= 0) {
        outOfStock += 1;
      } else if (quantity <= reorderLevel) {
        lowStock += 1;
      } else {
        inStock += 1;
      }
    });

    return res.json({
      success: true,

      data: {
        totalProducts,
        totalUnits,
        inStock,
        lowStock,
        outOfStock,
        inventoryCostValue,
        inventoryRetailValue,
        potentialProfit:
          inventoryRetailValue - inventoryCostValue,
      },
    });
  } catch (error) {
    console.error("Get stock summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to calculate stock summary.",
      error: error.message,
    });
  }
};


/**
 * GET LOW STOCK
 * GET /api/v1/stock/low-stock
 */
const getLowStock = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        status: "active",

        quantity: {
          [Op.gt]: 0,
        },

        [Op.and]: [
          sequelize.where(
            sequelize.col("quantity"),
            Op.lte,
            sequelize.col("reorderLevel")
          ),
        ],
      },

      include: [
        {
          model: Category,
          as: "Category",
          required: false,
        },

        {
          model: Brand,
          as: "Brand",
          required: false,
        },

        {
          model: ProductVariant,
          as: "Variants",
          required: false,
        },
      ],

      order: [
        ["quantity", "ASC"],
        ["name", "ASC"],
      ],
    });

    return res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error("Get low stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch low-stock products.",
      error: error.message,
    });
  }
};


/**
 * GET OUT OF STOCK
 * GET /api/v1/stock/out-of-stock
 */
const getOutOfStock = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        status: "active",

        quantity: {
          [Op.lte]: 0,
        },
      },

      include: [
        {
          model: Category,
          as: "Category",
          required: false,
        },

        {
          model: Brand,
          as: "Brand",
          required: false,
        },

        {
          model: ProductVariant,
          as: "Variants",
          required: false,
        },
      ],

      order: [["name", "ASC"]],
    });

    return res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error("Get out-of-stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch out-of-stock products.",
      error: error.message,
    });
  }
};


/**
 * ADJUST STOCK
 * PATCH /api/v1/stock/:productId
 *
 * This sets the product's stock to an exact quantity.
 */
const adjustStock = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { productId } = req.params;

    const {
      quantity,
      variantId = null,
      reason = "Manual stock adjustment",
      notes = null,
    } = req.body;

    if (quantity === undefined || quantity === null || quantity === "") {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Quantity is required.",
      });
    }

    const newQuantity = Number(quantity);

    if (!Number.isFinite(newQuantity) || newQuantity < 0) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Quantity must be a valid number greater than or equal to zero.",
      });
    }

    const product = await Product.findByPk(productId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!product) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    let targetQuantityBefore;
    let targetQuantityAfter;

    let variant = null;

    if (variantId) {
      variant = await ProductVariant.findOne({
        where: {
          id: variantId,
          productId,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!variant) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,
          message: "Product variant not found.",
        });
      }

      targetQuantityBefore = Number(variant.quantity || 0);
      targetQuantityAfter = newQuantity;

      await variant.update(
        {
          quantity: newQuantity,
        },
        { transaction }
      );
    } else {
      targetQuantityBefore = Number(product.quantity || 0);
      targetQuantityAfter = newQuantity;

      await product.update(
        {
          quantity: newQuantity,
        },
        { transaction }
      );
    }

    const quantityChange =
      targetQuantityAfter - targetQuantityBefore;

    let recordedById = null;

    if (req.user?.id) {
      recordedById = req.user.id;
    }

    const movement = await StockMovement.create(
      {
        productId: product.id,
        variantId: variant ? variant.id : null,

        movementType: "adjustment",

        quantityBefore: targetQuantityBefore,
        quantityChange,
        quantityAfter: targetQuantityAfter,

        referenceType: "manual_adjustment",

        referenceId: product.id,

        referenceNumber: product.sku || null,

        reason,

        notes,

        recordedById,
      },
      { transaction }
    );

    await transaction.commit();

    return res.status(200).json({
      success: true,

      message: "Stock adjusted successfully.",

      data: {
        productId: product.id,
        variantId: variant ? variant.id : null,

        quantityBefore: targetQuantityBefore,
        quantityChange,
        quantityAfter: targetQuantityAfter,

        movementId: movement.id,
      },
    });
  } catch (error) {
    await transaction.rollback();

    console.error("Adjust stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to adjust stock.",
      error: error.message,
    });
  }
};


/**
 * GET STOCK HISTORY
 * GET /api/v1/stock/history
 */
const getStockHistory = async (req, res) => {
  try {
    const {
      productId,
      variantId,
      movementType,
      search = "",
      page = 1,
      limit = 50,
    } = req.query;

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);

    const limitNumber = Math.min(
      Math.max(parseInt(limit, 10) || 50, 1),
      200
    );

    const offset = (pageNumber - 1) * limitNumber;

    const where = {};

    if (productId) {
      where.productId = productId;
    }

    if (variantId) {
      where.variantId = variantId;
    }

    if (movementType) {
      where.movementType = movementType;
    }

    if (search.trim()) {
      where[Op.or] = [
        {
          reason: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          referenceNumber: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
        {
          notes: {
            [Op.like]: `%${search.trim()}%`,
          },
        },
      ];
    }

    const { count, rows } =
      await StockMovement.findAndCountAll({
        where,

        include: [
          {
            model: Product,
            as: "Product",

            attributes: [
              "id",
              "name",
              "sku",
              "barcode",
              "image",
            ],
          },

          {
            model: ProductVariant,
            as: "Variant",

            required: false,

            attributes: [
              "id",
              "size",
              "color",
              "sku",
              "barcode",
            ],
          },

          {
            model: User,
            as: "RecordedBy",

            required: false,

            attributes: [
              "id",
              "name",
              "email",
            ],
          },
        ],

        order: [
          ["createdAt", "DESC"],
          ["id", "DESC"],
        ],

        limit: limitNumber,
        offset,

        distinct: true,
      });

    return res.json({
      success: true,

      data: rows,

      pagination: {
        total: count,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(count / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get stock history error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock history.",
      error: error.message,
    });
  }
};


/**
 * GET SINGLE PRODUCT STOCK HISTORY
 * GET /api/v1/stock/:productId/history
 */
const getProductStockHistory = async (req, res) => {
  try {
    const { productId } = req.params;

    const history = await StockMovement.findAll({
      where: {
        productId,
      },

      include: [
        {
          model: ProductVariant,
          as: "Variant",
          required: false,
        },

        {
          model: User,
          as: "RecordedBy",
          required: false,
          attributes: [
            "id",
            "name",
            "email",
          ],
        },
      ],

      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });

    return res.json({
      success: true,

      data: history,

      count: history.length,
    });
  } catch (error) {
    console.error(
      "Get product stock history error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product stock history.",
      error: error.message,
    });
  }
};


module.exports = {
  getStock,
  getStockSummary,
  getLowStock,
  getOutOfStock,
  adjustStock,
  getStockHistory,
  getProductStockHistory,
};