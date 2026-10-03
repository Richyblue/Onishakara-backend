const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Inventory = sequelize.define("Inventory", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

    productName: {
        type: DataTypes.STRING
    },

    quantity: {
        type: DataTypes.INTEGER
    },

    minimumQuantity: {
        type: DataTypes.INTEGER
    },

    unitPrice: {
        type: DataTypes.DECIMAL(12,2)
    }
});

module.exports = Inventory;