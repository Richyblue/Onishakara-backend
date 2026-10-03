const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CompanySettings = sequelize.define(
  "CompanySettings",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    // =========================
    // COMPANY INFORMATION
    // =========================

    companyName: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    companyPhone: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    companyEmail: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    companyAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // =========================
    // CURRENCY
    // =========================

    currency: {
      type: DataTypes.STRING(10),
      defaultValue: "NGN",
    },

    currencySymbol: {
      type: DataTypes.STRING(10),
      defaultValue: "₦",
    },

    // =========================
    // SALES / COMMISSION
    // =========================

    defaultCommissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10,
    },

    loyaltyPointRate: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1,
    },

    // =========================
    // INVENTORY
    // =========================

    lowStockThreshold: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },

    allowNegativeStock: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // =========================
    // TAX
    // =========================

    taxRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    // =========================
    // SALES APPROVAL
    // =========================

    autoApproveSales: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    // =========================
    // RECEIPT
    // =========================

    receiptFooter: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // =========================
    // ATTENDANCE SETTINGS
    // =========================

    openingTime: {
      type: DataTypes.TIME,
      defaultValue: "08:00:00",
    },

    closingTime: {
      type: DataTypes.TIME,
      defaultValue: "17:00:00",
    },

    gracePeriod: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      comment: "Grace period in minutes before staff is marked late",
    },

    workingHours: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 8,
      comment: "Standard working hours per day",
    },
  },
  {
    tableName: "CompanySettings",
    timestamps: true,
  }
);

module.exports = CompanySettings;