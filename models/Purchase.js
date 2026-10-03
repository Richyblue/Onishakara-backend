const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Purchase = sequelize.define(
  "Purchase",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    purchaseNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    supplierId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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

    tax: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    shippingCost: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    otherCharges: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    totalAmount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    amountPaid: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    balanceDue: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    paymentMethod: {
      type: DataTypes.ENUM(
        "cash",
        "transfer",
        "pos",
        "bank",
        "mixed",
        "credit"
      ),
      allowNull: false,
      defaultValue: "cash",
    },

    paymentStatus: {
      type: DataTypes.ENUM(
        "unpaid",
        "partial",
        "paid"
      ),
      allowNull: false,
      defaultValue: "unpaid",
    },

    status: {
      type: DataTypes.ENUM(
        "draft",
        "received",
        "cancelled"
      ),
      allowNull: false,
      defaultValue: "draft",
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    invoiceNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    recordedById: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    tableName: "Purchases",
    timestamps: true,
    paranoid: true,
  }
);

Purchase.associate = (models) => {
  if (models.Supplier) {
    Purchase.belongsTo(models.Supplier, {
      foreignKey: "supplierId",
      as: "Supplier",
    });
  }

  if (models.PurchaseItem) {
    Purchase.hasMany(models.PurchaseItem, {
      foreignKey: "purchaseId",
      as: "Items",
      onDelete: "CASCADE",
    });
  }

  if (models.User) {
    Purchase.belongsTo(models.User, {
      foreignKey: "recordedById",
      as: "RecordedBy",
    });
  }
};

module.exports = Purchase;