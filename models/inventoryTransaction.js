const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Product = require("../models/Product");

const InventoryTransaction =
sequelize.define(
    "InventoryTransaction",
    {
        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },

        type: {
            type: DataTypes.ENUM(
                "stock_in",
                "stock_out",
                "adjustment"
            )
        },

        quantity: {
            type: DataTypes.INTEGER
        },

        note: {
            type: DataTypes.TEXT
        }
    }
);

Product.hasMany(
    InventoryTransaction
);

InventoryTransaction.belongsTo(
    Product
);