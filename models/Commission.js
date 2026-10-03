const DataTypes=require("sequelize");
const sequelize=require("../config/db");
const Staff = require("../models/Staff");
const Sale =require("../models/Sale");
const SaleItem =require("../models/saleItem")
const Commission = sequelize.define("Commission", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

    commissionRate: {
        type: DataTypes.DECIMAL(5,2)
    },

    commissionAmount: {
        type: DataTypes.DECIMAL(12,2)
    },

    commissionDate: {
        type: DataTypes.DATEONLY
    },
    ServiceId: {
        type: DataTypes.BIGINT,
        allowNull: true,
      },

    status: {
        type: DataTypes.ENUM(
            "pending",
            "paid"
        ),
        defaultValue: "pending"
    },
    paidAt: {
        type: DataTypes.DATE
    }
});

Staff.hasMany(Commission);
Commission.belongsTo(Staff);

Sale.hasOne(Commission);
Commission.belongsTo(Sale);

SaleItem.hasMany(Commission, {
    foreignKey: "SaleItemId",
    as: "Commissions"
});

Commission.belongsTo(SaleItem, {
    foreignKey: "SaleItemId",
    as: "SaleItem"
});



module.exports=Commission;