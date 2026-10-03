const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Category = sequelize.define(
  "Category",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: {
          msg: "Category name is required",
        },
      },
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  {
    tableName: "Categories",
    timestamps: true,
    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ["name"],
      },
      {
        fields: ["status"],
      },
    ],
  }
);

Category.associate = (models) => {
  if (models.Product) {
    Category.hasMany(models.Product, {
      foreignKey: "categoryId",
      as: "Products",
    });
  }
};

module.exports = Category;