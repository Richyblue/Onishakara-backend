const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Sale = sequelize.define(
  "Sale",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    // =====================================================
    // OFFLINE SALE IDENTIFIER
    // =====================================================

    localSaleId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },

    // =====================================================
    // TOTAL
    // =====================================================

    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    // =====================================================
    // SALE TYPE
    // =====================================================

    saleType: {
      type: DataTypes.ENUM("product"),
      defaultValue: "product",
    },

    // =====================================================
    // RECEIPT
    // =====================================================

    receiptNumber: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: false,
    },

    // =====================================================
    // APPROVAL
    // =====================================================

    approvalStatus: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "declined"
      ),
      defaultValue: "approved",
    },

    // =====================================================
    // AMOUNTS
    // =====================================================

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    discount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    // =====================================================
    // PAYMENT
    // =====================================================

    paymentMethod: {
      type: DataTypes.ENUM(
        "cash",
        "transfer",
        "pos",
        "mixed"
      ),
      defaultValue: "cash",
    },

    // =====================================================
    // LOYALTY
    // =====================================================

    pointsUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // =====================================================
    // SALE STATUS
    // =====================================================

    status: {
      type: DataTypes.ENUM(
        "completed",
        "refunded",
        "voided"
      ),
      defaultValue: "completed",
    },

    // =====================================================
    // OPTIONAL STORE REFERENCES
    // =====================================================

    StandTag: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    CardNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    // =====================================================
    // NOTE
    // =====================================================

    note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // =====================================================
    // CUSTOMER
    // =====================================================

    CustomerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    // =====================================================
    // CASHIER / USER
    // =====================================================

    RecordedById: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },

  {
    tableName: "Sales",
    timestamps: true,
  }
);


// =========================================================
// ASSOCIATIONS
// =========================================================

Sale.associate = (models) => {

  // -------------------------------------------------------
  // CUSTOMER
  // -------------------------------------------------------

  if (models.Customer) {
    Sale.belongsTo(models.Customer, {
      foreignKey: "CustomerId",
      as: "Customer",
    });
  }


  // -------------------------------------------------------
  // USER / CASHIER
  // -------------------------------------------------------

  if (models.User) {
    Sale.belongsTo(models.User, {
      foreignKey: "RecordedById",
      as: "RecordedBy",
    });
  }


  // -------------------------------------------------------
  // SALE ITEMS
  // -------------------------------------------------------

  if (models.SaleItem) {
    Sale.hasMany(models.SaleItem, {
      foreignKey: "SaleId",
      as: "SaleItems",
      onDelete: "CASCADE",
    });
  }
};


module.exports = Sale;