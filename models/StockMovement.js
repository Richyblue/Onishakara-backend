const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StockMovement = sequelize.define(
  "StockMovement",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    productId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    variantId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    movementType: {
      type: DataTypes.ENUM(
        "purchase",
        "sale",
        "adjustment",
        "return",
        "damage",
        "loss",
        "opening",
        "transfer"
      ),
      allowNull: false,
    },

    quantityBefore: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
    },

    quantityChange: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
    },

    quantityAfter: {
      type: DataTypes.DECIMAL(12, 3),
      allowNull: false,
      defaultValue: 0,
    },

    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    referenceId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    referenceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    recordedById: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: "StockMovements",
    timestamps: true,
  }
);

StockMovement.associate = (models) => {
  if (models.Product) {
    StockMovement.belongsTo(models.Product, {
      foreignKey: "productId",
      as: "Product",
    });
  }

  if (models.ProductVariant) {
    StockMovement.belongsTo(models.ProductVariant, {
      foreignKey: "variantId",
      as: "Variant",
    });
  }

  if (models.User) {
    StockMovement.belongsTo(models.User, {
      foreignKey: "recordedById",
      as: "RecordedBy",
    });
  }
};

module.exports = StockMovement;