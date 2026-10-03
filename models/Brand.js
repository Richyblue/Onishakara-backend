const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Brand = sequelize.define(
  "Brand",
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
          msg: "Brand name is required",
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
    tableName: "Brands",
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

Brand.associate = (models) => {
  if (models.Product) {
    Brand.hasMany(models.Product, {
      foreignKey: "brandId",
      as: "Products",
    });
  }
};

module.exports = Brand;