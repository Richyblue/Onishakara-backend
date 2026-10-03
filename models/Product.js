const DataTypes = require("sequelize");
const sequelize = require("../config/db");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    sku: {
      type: DataTypes.STRING,
      unique: true,
    },

    barcode: {
      type: DataTypes.STRING,
    },

    // NEW
    categoryId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    // NEW
    brandId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    costPrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    sellingPrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    reorderLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },

    image: {
      type: DataTypes.STRING,
    },

    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "Products",
    paranoid: true,
    timestamps: true,
  }
);

/*
|--------------------------------------------------------------------------
| ASSOCIATIONS
|--------------------------------------------------------------------------
*/

Product.associate = (models) => {
  if (models.PurchaseItem) {
    Product.hasMany(models.PurchaseItem, {
      foreignKey: "productId",
      as: "PurchaseItems",
    });
  }
  // Category
  if (models.Category) {
    Product.belongsTo(models.Category, {
      foreignKey: "categoryId",
      as: "Category",
    });
  }

  // Brand
  if (models.Brand) {
    Product.belongsTo(models.Brand, {
      foreignKey: "brandId",
      as: "Brand",
    });
  }

  // Product Variants
  if (models.ProductVariant) {
    Product.hasMany(models.ProductVariant, {
      foreignKey: "productId",
      as: "Variants",
    });
  }

  // Existing consumption relationship
  if (models.ProductConsumptionItem) {
    Product.hasMany(models.ProductConsumptionItem, {
      foreignKey: "product_id",
      as: "ConsumptionItems",
    });
  }
};

module.exports = Product;