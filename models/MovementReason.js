const DataTypes = require("sequelize");

const sequelize = require("../config/db");

const MovementReason = sequelize.define("MovementReason",{

    id:{

        type:DataTypes.BIGINT,

        autoIncrement:true,

        primaryKey:true

    },

    reason:{

        type:DataTypes.STRING,

        allowNull:false,

        unique:true

    },

    description:{

        type:DataTypes.TEXT

    },

    maximumDuration:{

        type:DataTypes.INTEGER,

        defaultValue:15

    },

    requiresApproval:{

        type:DataTypes.BOOLEAN,

        defaultValue:false

    },

    penaltyEnabled:{

        type:DataTypes.BOOLEAN,

        defaultValue:true

    },

    penaltyPercent:{

        type:DataTypes.DECIMAL(5,2),

        defaultValue:10

    },

    status:{

        type:DataTypes.ENUM(

            "active",

            "inactive"

        ),

        defaultValue:"active"

    }

},{
    timestamps:true
});

module.exports=MovementReason;