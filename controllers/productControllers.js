const { Op } = require("sequelize");
const sequelize = require("../config/db");

const {
  Product,
  Category,
  Brand,
  ProductVariant,
} = require("../models");

/*
|--------------------------------------------------------------------------
| PRODUCT INCLUDE
|--------------------------------------------------------------------------
*/

const productInclude = [
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
    separate: true,
    order: [["id", "ASC"]],
  },
];

/*
|--------------------------------------------------------------------------
| CREATE PRODUCT
|--------------------------------------------------------------------------
*/

exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      barcode,
      categoryId,
      brandId,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      image,
      status,
      variants,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK SKU
    |--------------------------------------------------------------------------
    */

    if (sku) {
      const existingSku = await Product.findOne({
        where: { sku },
        paranoid: false,
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "Product SKU already exists",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK BARCODE
    |--------------------------------------------------------------------------
    */

    if (barcode) {
      const existingBarcode = await Product.findOne({
        where: { barcode },
        paranoid: false,
      });

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message: "Product barcode already exists",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE CATEGORY
    |--------------------------------------------------------------------------
    */

    if (categoryId) {
      const category = await Category.findByPk(categoryId);

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Selected category does not exist",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | VALIDATE BRAND
    |--------------------------------------------------------------------------
    */

    if (brandId) {
      const brand = await Brand.findByPk(brandId);

      if (!brand) {
        return res.status(400).json({
          success: false,
          message: "Selected brand does not exist",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE PRODUCT
    |--------------------------------------------------------------------------
    */

    const product = await Product.create({
      name: String(name).trim(),
      sku: sku || null,
      barcode: barcode || null,
      categoryId: categoryId || null,
      brandId: brandId || null,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      reorderLevel:
        reorderLevel !== undefined
          ? Number(reorderLevel)
          : 5,
      image: image || null,
      status: status || "active",
    });

    /*
    |--------------------------------------------------------------------------
    | CREATE VARIANTS
    |--------------------------------------------------------------------------
    */

    let createdVariants = [];

    if (Array.isArray(variants) && variants.length > 0) {
      for (const variant of variants) {
        if (!variant) continue;

        const createdVariant = await ProductVariant.create({
          productId: product.id,
          size: variant.size || null,
          color: variant.color || null,
          sku: variant.sku || null,
          barcode: variant.barcode || null,
          costPrice: Number(variant.costPrice) || 0,
          sellingPrice: Number(variant.sellingPrice) || 0,
          quantity: Number(variant.quantity) || 0,
          reorderLevel:
            variant.reorderLevel !== undefined
              ? Number(variant.reorderLevel)
              : 5,
          image: variant.image || null,
          status: variant.status || "active",
        });

        createdVariants.push(createdVariant);
      }
    }

    /*
    |--------------------------------------------------------------------------
    | RETURN PRODUCT
    |--------------------------------------------------------------------------
    */

    const result = await Product.findByPk(product.id, {
      include: productInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: result,
    });
  } catch (error) {
    console.error("Create product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET ALL PRODUCTS
|--------------------------------------------------------------------------
*/

exports.getProducts = async (req, res) => {
  try {
    const {
      search,
      categoryId,
      brandId,
      status,
      lowStock,
      page = 1,
      limit = 100,
    } = req.query;

    const where = {};

    /*
    |--------------------------------------------------------------------------
    | SEARCH
    |--------------------------------------------------------------------------
    */

    if (search && search.trim()) {
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

    /*
    |--------------------------------------------------------------------------
    | CATEGORY
    |--------------------------------------------------------------------------
    */

    if (categoryId) {
      where.categoryId = categoryId;
    }

    /*
    |--------------------------------------------------------------------------
    | BRAND
    |--------------------------------------------------------------------------
    */

    if (brandId) {
      where.brandId = brandId;
    }

    /*
    |--------------------------------------------------------------------------
    | STATUS
    |--------------------------------------------------------------------------
    */

    if (status) {
      where.status = status;
    }

    /*
    |--------------------------------------------------------------------------
    | LOW STOCK
    |--------------------------------------------------------------------------
    */

    if (lowStock === "true") {
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          quantity: {
            [Op.lte]: sequelize.col("Product.reorderLevel"),
          },
        },
      ];
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(limit) || 100, 1),
      500
    );

    const offset = (pageNumber - 1) * limitNumber;

    const { count, rows } = await Product.findAndCountAll({
      where,
      include: productInclude,
      distinct: true,
      limit: limitNumber,
      offset,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(count / limitNumber),
      products: rows,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE PRODUCT
|--------------------------------------------------------------------------
*/

exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      include: productInclude,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("Get product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET PRODUCT BY BARCODE
|--------------------------------------------------------------------------
*/

exports.getProductByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode) {
      return res.status(400).json({
        success: false,
        message: "Barcode is required",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK PRODUCT
    |--------------------------------------------------------------------------
    */

    const product = await Product.findOne({
      where: {
        barcode,
      },
      include: productInclude,
    });

    if (product) {
      return res.status(200).json({
        success: true,
        type: "product",
        product,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | CHECK VARIANT
    |--------------------------------------------------------------------------
    */

    const variant = await ProductVariant.findOne({
      where: {
        barcode,
      },
      include: [
        {
          model: Product,
          as: "Product",
          required: true,
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
          ],
        },
      ],
    });

    if (variant) {
      return res.status(200).json({
        success: true,
        type: "variant",
        variant,
        product: variant.Product,
      });
    }

    return res.status(404).json({
      success: false,
      message: "No product or variant found with this barcode",
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to search barcode",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT
|--------------------------------------------------------------------------
*/

exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      name,
      sku,
      barcode,
      categoryId,
      brandId,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      image,
      status,
    } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | SKU CHECK
    |--------------------------------------------------------------------------
    */

    if (sku && sku !== product.sku) {
      const existingSku = await Product.findOne({
        where: {
          sku,
          id: {
            [Op.ne]: id,
          },
        },
        paranoid: false,
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "Product SKU already exists",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | BARCODE CHECK
    |--------------------------------------------------------------------------
    */

    if (barcode && barcode !== product.barcode) {
      const existingBarcode = await Product.findOne({
        where: {
          barcode,
          id: {
            [Op.ne]: id,
          },
        },
        paranoid: false,
      });

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message: "Product barcode already exists",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | CATEGORY CHECK
    |--------------------------------------------------------------------------
    */

    if (categoryId) {
      const category = await Category.findByPk(categoryId);

      if (!category) {
        return res.status(400).json({
          success: false,
          message: "Selected category does not exist",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | BRAND CHECK
    |--------------------------------------------------------------------------
    */

    if (brandId) {
      const brand = await Brand.findByPk(brandId);

      if (!brand) {
        return res.status(400).json({
          success: false,
          message: "Selected brand does not exist",
        });
      }
    }

    await product.update({
      name:
        name !== undefined
          ? String(name).trim()
          : product.name,

      sku:
        sku !== undefined
          ? sku || null
          : product.sku,

      barcode:
        barcode !== undefined
          ? barcode || null
          : product.barcode,

      categoryId:
        categoryId !== undefined
          ? categoryId || null
          : product.categoryId,

      brandId:
        brandId !== undefined
          ? brandId || null
          : product.brandId,

      costPrice:
        costPrice !== undefined
          ? Number(costPrice) || 0
          : product.costPrice,

      sellingPrice:
        sellingPrice !== undefined
          ? Number(sellingPrice) || 0
          : product.sellingPrice,

      quantity:
        quantity !== undefined
          ? Number(quantity) || 0
          : product.quantity,

      reorderLevel:
        reorderLevel !== undefined
          ? Number(reorderLevel)
          : product.reorderLevel,

      image:
        image !== undefined
          ? image
          : product.image,

      status:
        status !== undefined
          ? status
          : product.status,
    });

    const updatedProduct = await Product.findByPk(id, {
      include: productInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("Update product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT STOCK
|--------------------------------------------------------------------------
*/

exports.updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, operation } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const amount = Number(quantity);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid quantity",
      });
    }

    let newQuantity = Number(product.quantity) || 0;

    if (operation === "add") {
      newQuantity += amount;
    } else if (operation === "subtract") {
      newQuantity -= amount;

      if (newQuantity < 0) {
        return res.status(400).json({
          success: false,
          message: "Insufficient stock",
        });
      }
    } else if (operation === "set") {
      newQuantity = amount;
    } else {
      return res.status(400).json({
        success: false,
        message:
          'Operation must be "add", "subtract", or "set"',
      });
    }

    await product.update({
      quantity: newQuantity,
    });

    return res.status(200).json({
      success: true,
      message: "Product stock updated successfully",
      quantity: newQuantity,
      product,
    });
  } catch (error) {
    console.error("Update stock error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product stock",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| ADD PRODUCT VARIANT
|--------------------------------------------------------------------------
*/

exports.addProductVariant = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      size,
      color,
      sku,
      barcode,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      image,
      status,
    } = req.body;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (sku) {
      const existingSku = await ProductVariant.findOne({
        where: {
          sku,
        },
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "Variant SKU already exists",
        });
      }
    }

    if (barcode) {
      const existingBarcode = await ProductVariant.findOne({
        where: {
          barcode,
        },
      });

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message: "Variant barcode already exists",
        });
      }
    }

    const variant = await ProductVariant.create({
      productId: product.id,
      size: size || null,
      color: color || null,
      sku: sku || null,
      barcode: barcode || null,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      reorderLevel:
        reorderLevel !== undefined
          ? Number(reorderLevel)
          : 5,
      image: image || null,
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "Product variant created successfully",
      variant,
    });
  } catch (error) {
    console.error("Add product variant error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create product variant",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE PRODUCT VARIANT
|--------------------------------------------------------------------------
*/

exports.updateProductVariant = async (req, res) => {
  try {
    const { variantId } = req.params;

    const variant = await ProductVariant.findByPk(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: "Product variant not found",
      });
    }

    const {
      size,
      color,
      sku,
      barcode,
      costPrice,
      sellingPrice,
      quantity,
      reorderLevel,
      image,
      status,
    } = req.body;

    if (sku && sku !== variant.sku) {
      const existingSku = await ProductVariant.findOne({
        where: {
          sku,
          id: {
            [Op.ne]: variant.id,
          },
        },
      });

      if (existingSku) {
        return res.status(409).json({
          success: false,
          message: "Variant SKU already exists",
        });
      }
    }

    if (barcode && barcode !== variant.barcode) {
      const existingBarcode = await ProductVariant.findOne({
        where: {
          barcode,
          id: {
            [Op.ne]: variant.id,
          },
        },
      });

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message: "Variant barcode already exists",
        });
      }
    }

    await variant.update({
      size:
        size !== undefined
          ? size
          : variant.size,

      color:
        color !== undefined
          ? color
          : variant.color,

      sku:
        sku !== undefined
          ? sku || null
          : variant.sku,

      barcode:
        barcode !== undefined
          ? barcode || null
          : variant.barcode,

      costPrice:
        costPrice !== undefined
          ? Number(costPrice) || 0
          : variant.costPrice,

      sellingPrice:
        sellingPrice !== undefined
          ? Number(sellingPrice) || 0
          : variant.sellingPrice,

      quantity:
        quantity !== undefined
          ? Number(quantity) || 0
          : variant.quantity,

      reorderLevel:
        reorderLevel !== undefined
          ? Number(reorderLevel)
          : variant.reorderLevel,

      image:
        image !== undefined
          ? image
          : variant.image,

      status:
        status !== undefined
          ? status
          : variant.status,
    });

    return res.status(200).json({
      success: true,
      message: "Product variant updated successfully",
      variant,
    });
  } catch (error) {
    console.error("Update product variant error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update product variant",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE PRODUCT
|--------------------------------------------------------------------------
| Soft delete because Product uses paranoid: true
|--------------------------------------------------------------------------
*/

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    await product.destroy();

    return res.status(200).json({
      success: true,
      message: "Product moved to recycle bin",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| RECYCLE BIN
|--------------------------------------------------------------------------
*/

exports.getDeletedProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      paranoid: false,

      where: {
        deletedAt: {
          [Op.ne]: null,
        },
      },

      include: productInclude,

      order: [["deletedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error("Get recycle bin error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recycle bin",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| RESTORE PRODUCT
|--------------------------------------------------------------------------
*/

exports.restoreProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      paranoid: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Product is not in the recycle bin",
      });
    }

    await product.restore();

    const restoredProduct = await Product.findByPk(id, {
      include: productInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Product restored successfully",
      product: restoredProduct,
    });
  } catch (error) {
    console.error("Restore product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to restore product",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| PERMANENT DELETE PRODUCT
|--------------------------------------------------------------------------
*/

exports.permanentlyDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByPk(id, {
      paranoid: false,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!product.deletedAt) {
      return res.status(400).json({
        success: false,
        message:
          "Product must be in the recycle bin before permanent deletion",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | DELETE VARIANTS FIRST
    |--------------------------------------------------------------------------
    */

    await ProductVariant.destroy({
      where: {
        productId: product.id,
      },
    });

    /*
    |--------------------------------------------------------------------------
    | PERMANENT PRODUCT DELETE
    |--------------------------------------------------------------------------
    */

    await product.destroy({
      force: true,
    });

    return res.status(200).json({
      success: true,
      message: "Product permanently deleted",
    });
  } catch (error) {
    console.error("Permanent delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to permanently delete product",
      error: error.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| EMPTY PRODUCT RECYCLE BIN
|--------------------------------------------------------------------------
*/

exports.emptyRecycleBin = async (req, res) => {
  try {
    const deletedProducts = await Product.findAll({
      paranoid: false,

      where: {
        deletedAt: {
          [Op.ne]: null,
        },
      },
    });

    if (deletedProducts.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Recycle bin is already empty",
        deletedCount: 0,
      });
    }

    let deletedCount = 0;

    for (const product of deletedProducts) {
      await ProductVariant.destroy({
        where: {
          productId: product.id,
        },
      });

      await product.destroy({
        force: true,
      });

      deletedCount++;
    }

    return res.status(200).json({
      success: true,
      message: "Product recycle bin emptied successfully",
      deletedCount,
    });
  } catch (error) {
    console.error("Empty recycle bin error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to empty recycle bin",
      error: error.message,
    });
  }
};