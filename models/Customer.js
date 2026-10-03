const DataTypes = require("sequelize");
const sequelize = require("../config/db");
const Customer = sequelize.define("Customer", {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
  },

  fullname: {
    type: DataTypes.STRING,
  },

  phone: {
    type: DataTypes.STRING,
  },

  email: {
    type: DataTypes.STRING,
  },

  address: {type:DataTypes.STRING,
  },
  
  gender: DataTypes.ENUM("male", "female"),

  dateOfBirth: DataTypes.DATEONLY,

  customerType: DataTypes.ENUM("regular", "vip", "corporate"),

  walletBalance: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  loyaltyPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
});

module.exports = Customer;
