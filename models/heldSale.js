const DataTypes = require("sequelize");
const sequelize = require("../config/db");

const Customer = require("./Customer");
const User = require("./User");

const HeldSale = sequelize.define("HeldSale", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },

  holdNumber: {
    type: DataTypes.STRING,
    unique: true,
  },

  items: {
    type: DataTypes.JSON,
    allowNull: false,
  },

  subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

  discount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

  totalAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

  loyaltyPointsUsed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  note: {
    type: DataTypes.TEXT,
  },

  status: {
    type: DataTypes.ENUM(
      "held",
      "restored",
      "cancelled"
    ),
    defaultValue: "held",
  },
});

Customer.hasMany(HeldSale);
HeldSale.belongsTo(Customer);

User.hasMany(HeldSale);
HeldSale.belongsTo(User, {
  as: "HeldBy",
});

module.exports = HeldSale;