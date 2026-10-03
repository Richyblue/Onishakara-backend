const DataTypes = require('sequelize')
const sequelize = require('../config/db')

const ServiceCommission = sequelize.define(
  "ServiceCommission",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    service_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,
    },

    // ==========================================
    // IN-SALON COMMISSION
    // ==========================================

    in_salon_staff_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 30,
    },

    in_salon_owner_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 70,
    },

    // ==========================================
    // HOME SERVICE COMMISSION
    // ==========================================

    home_service_staff_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 50,
    },

    home_service_owner_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 50,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "service_commissions",
    timestamps: true,
  }
);

ServiceCommission.associate = (models) => {
  ServiceCommission.belongsTo(models.Service, {
    foreignKey: "service_id",
    as: "Service",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
};

module.exports = ServiceCommission;