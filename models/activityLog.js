const DataTypes=require("sequelize");
const sequelize=require("../config/db");

const ActivityLog = sequelize.define("ActivityLog", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

    action: {
        type: DataTypes.STRING
    },

    tableName: {
        type: DataTypes.STRING
    },

    recordId: {
        type: DataTypes.BIGINT
    },

    description: {
        type: DataTypes.TEXT
    }
});

module.exports=ActivityLog;