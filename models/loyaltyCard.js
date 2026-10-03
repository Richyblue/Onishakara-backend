const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Customer=require("../models/Customer");
const LoyaltyCard =
sequelize.define(
    "LoyaltyCard",
    {

        id: {
            type: DataTypes.BIGINT,
            autoIncrement: true,
            primaryKey: true
        },

        cardNumber: {
            type: DataTypes.STRING,
            unique: true
        },

        status: {
            type: DataTypes.ENUM(
                "active",
                "inactive"
            ),
            defaultValue:
            "active"
        }
    }
);

Customer.hasOne(
    LoyaltyCard
);

LoyaltyCard.belongsTo(
    Customer
);

module.exports=LoyaltyCard;