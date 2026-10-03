const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Service = sequelize.define("Service", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false
    },

    price: {
        type: DataTypes.DECIMAL(12,2),
        allowNull: false
    },

    duration: {
        type: DataTypes.INTEGER
    }
});

module.exports=Service;