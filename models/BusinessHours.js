const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BusinessHours = sequelize.define(
  "BusinessHours",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    dayOfWeek: {
      type: DataTypes.ENUM(
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
      ),
      allowNull: false,
      unique: true,
    },

    openingTime: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "09:00:00",
    },

    closingTime: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "21:00:00",
    },

    isOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    gracePeriod: {
      type: DataTypes.INTEGER,
      defaultValue: 15,
      comment: "Grace period in minutes",
    },
  },
  {
    tableName: "BusinessHours",
    timestamps: true,
  }
);

module.exports = BusinessHours;