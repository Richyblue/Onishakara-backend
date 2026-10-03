const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const LeaveRequest = sequelize.define("LeaveRequest", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

    startDate: {
        type: DataTypes.DATEONLY
    },

    endDate: {
        type: DataTypes.DATEONLY
    },

    reason: {
        type: DataTypes.TEXT
    },

    status: {
        type: DataTypes.ENUM(
            "pending",
            "approved",
            "declined"
        ),
        defaultValue: "pending"
    }
});

module.exports=LeaveRequest;

