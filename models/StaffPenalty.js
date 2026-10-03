const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const StaffPenalty = sequelize.define(
  "StaffPenalty",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    StaffId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    AttendanceId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    StaffMovementId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    deductionSource: {
      type: DataTypes.ENUM(
        "salary",
        "commission"
      ),
      allowNull: false,
    },

    penaltyType: {
      type: DataTypes.ENUM(
        "late",
        "absent",
        "overtime",
        "movement_overstay",
        "early_clockout"
      ),
      allowNull: false,
    },

    penaltyRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 10,
    },

    baseAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    penaltyAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM(
        "pending",
        "approved",
        "deducted",
        "waived"
      ),
      defaultValue: "pending",
    },

    reason: {
      type: DataTypes.TEXT,
    },

    penaltyDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "StaffPenalties",
    timestamps: true,
  }
);
StaffPenalty.associate = (models) => {
  StaffPenalty.belongsTo(models.Staff, {
    foreignKey: "StaffId",
    as: "staff",
  });

  StaffPenalty.belongsTo(models.Attendance, {
    foreignKey: "AttendanceId",
    as: "attendance",
  });

  StaffPenalty.belongsTo(models.StaffMovement, {
    foreignKey: "StaffMovementId",
    as: "movement",
  });
};

module.exports = StaffPenalty;