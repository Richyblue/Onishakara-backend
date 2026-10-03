const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Sale =require("../models/Sale");

const Receipt = sequelize.define(
    "Receipt",
    {
        receiptNumber: {
            type: DataTypes.STRING,
            unique: true
        },

        printedAt: {
            type: DataTypes.DATE
        }
    }
);

Sale.hasOne(Receipt);
Receipt.belongsTo(Sale);

module.exports=Receipt;