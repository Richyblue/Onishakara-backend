const DataTypes=require("sequelize");

const sequelize=require("../config/db");

const Staff=require("./Staff");
const MovementReason=require("./MovementReason");

const StaffMovement=sequelize.define("StaffMovement",{

    id:{
        type:DataTypes.BIGINT,
        autoIncrement:true,
        primaryKey:true
    },

    reason:{
        type:DataTypes.ENUM(

            "restroom",

            "buy_material",

            "bank",

            "lunch",

            "official",

            "personal"

        )
    },

    expectedReturn:{
        type:DataTypes.INTEGER
    },

    timeOut:{
        type:DataTypes.DATE
    },

    timeIn:{
        type:DataTypes.DATE
    },

    duration:{
        type:DataTypes.INTEGER,
        defaultValue:0
    },

    status:{
        type:DataTypes.ENUM(

            "outside",

            "returned"

        ),

        defaultValue:"outside"
    },
    approvedBy:{

        type:DataTypes.BIGINT
    
    },
    
    overStayed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    
    overStayMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    
    penaltyApplied: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    penaltyRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
    
    penaltyAmount: {
        type: DataTypes.DECIMAL(12,2),
        defaultValue: 0
    },
    
    remarks:{
    
        type:DataTypes.TEXT
    
    }

});

Staff.hasMany(StaffMovement);

StaffMovement.belongsTo(Staff);

StaffMovement.associate = (models) => {
    StaffMovement.belongsTo(models.Staff, {
      foreignKey: "StaffId",
      as: "staff",
    });
  
    StaffMovement.hasMany(models.StaffPenalty, {
      foreignKey: "StaffMovementId",
      as: "penalties",
    });
  };

module.exports=StaffMovement;