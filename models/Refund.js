const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Sale =require("../models/Sale");
const User =require("../models/User");

const Refund = sequelize.define("Refund", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

    amount: {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false
    },

    reason: {
        type: DataTypes.TEXT
    },

    refundedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
});

Sale.hasMany(Refund);
Refund.belongsTo(Sale);

User.hasMany(Refund);
Refund.belongsTo(User);

module.exports=Refund;