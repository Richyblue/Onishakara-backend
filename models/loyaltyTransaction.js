const { DataTypes } = require("sequelize");

const sequelize = require("../config/db");

const Customer = require("./Customer");

const LoyaltyTransaction = sequelize.define("LoyaltyTransaction", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },

  type: {
    type: DataTypes.ENUM("earn", "redeem", "wallet_credit", "wallet_debit"),
  },

  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

  amount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

  reference: {
    type: DataTypes.STRING,
  },
});

Customer.hasMany(LoyaltyTransaction);

LoyaltyTransaction.belongsTo(Customer);

module.exports = LoyaltyTransaction;
