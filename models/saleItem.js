const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Sale = require("./Sale");
const Product = require("./Product");
const ProductVariant = require("./ProductVariant");

const SaleItem = sequelize.define(
  "SaleItem",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    SaleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    ProductId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    ProductVariantId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    itemType: {
      type: DataTypes.ENUM("product"),
      allowNull: false,
      defaultValue: "product",
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    // IMPORTANT:
    // Historical cost at the time of sale.
    costPrice: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "SaleItems",
    timestamps: true,
  }
);

// ============================================================
// ASSOCIATIONS
// ============================================================

Sale.hasMany(SaleItem, {
  foreignKey: "SaleId",
  as: "SaleItems",
});

SaleItem.belongsTo(Sale, {
  foreignKey: "SaleId",
  as: "Sale",
});

Product.hasMany(SaleItem, {
  foreignKey: "ProductId",
  as: "SaleItems",
});

SaleItem.belongsTo(Product, {
  foreignKey: "ProductId",
  as: "Product",
});

ProductVariant.hasMany(SaleItem, {
  foreignKey: "ProductVariantId",
  as: "SaleItems",
});

SaleItem.belongsTo(ProductVariant, {
  foreignKey: "ProductVariantId",
  as: "ProductVariant",
});

module.exports = SaleItem;