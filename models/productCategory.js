const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Product = require("../models/Product");
const ProductCategory = sequelize.define(
    "ProductCategory",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },

        name: {
            type: DataTypes.STRING,
            unique: true
        }
    }
);

ProductCategory.hasMany(Product);
Product.belongsTo(ProductCategory);

module.exports=ProductCategory;