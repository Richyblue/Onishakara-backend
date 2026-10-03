const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ProductVariant = sequelize.define(
  "ProductVariant",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    // Parent product
    productId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    // Fashion attributes
    size: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    color: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Variant identification
    sku: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },

    barcode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },

    // Variant pricing
    costPrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    sellingPrice: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    // Variant stock
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    reorderLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },

    // Variant image
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // Status
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      defaultValue: "active",
    },
  },
  {
    tableName: "ProductVariants",
    timestamps: true,
  }
);

// ==========================================
// ASSOCIATIONS
// ==========================================
ProductVariant.associate = (models) => {
  ProductVariant.belongsTo(models.Product, {
    foreignKey: "productId",
    as: "Product",
  });
};

module.exports = ProductVariant;