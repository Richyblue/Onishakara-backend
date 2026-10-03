const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PurchaseItem = sequelize.define(
  "PurchaseItem",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    purchaseId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    productId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    variantId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    productName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    variantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    quantity: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 1,
    },

    costPrice: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    discount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    total: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "PurchaseItems",
    timestamps: true,
  }
);

PurchaseItem.associate = (models) => {
  if (models.Purchase) {
    PurchaseItem.belongsTo(models.Purchase, {
      foreignKey: "purchaseId",
      as: "Purchase",
    });
  }

  if (models.Product) {
    PurchaseItem.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "Product",
    });
  }

  if (models.ProductVariant) {
    PurchaseItem.belongsTo(models.ProductVariant, {
      foreignKey: "variantId",
      as: "Variant",
    });
  }
};

module.exports = PurchaseItem;