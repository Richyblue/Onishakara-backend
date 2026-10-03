const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Supplier = sequelize.define(
  "Supplier",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: "Supplier name is required",
        },
      },
    },

    companyName: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },

    contactPerson: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      validate: {
        isEmail: {
          msg: "Please provide a valid email address",
        },
      },
    },

    address: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    state: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: "Nigeria",
    },

    taxNumber: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    bankName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    accountNumber: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    accountName: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },

    openingBalance: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "Suppliers",
    timestamps: true,
    paranoid: true,
  }
);

Supplier.associate = (models) => {
  if (models.Purchase) {
    Supplier.hasMany(models.Purchase, {
      foreignKey: "supplierId",
      as: "Purchases",
    });
  }
};

module.exports = Supplier;