const DataTypes = require("sequelize");
const sequelize = require("../config/db");

const Staff = require("./Staff");

const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    attendanceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    clockIn: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    clockOut: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    workingHours: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM("present", "absent", "late"),
      defaultValue: "present",
    },

    overtime: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    lateMinutes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    isLate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    absent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    clockInDevice: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    clockOutDevice: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    penaltyApplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    penaltyType: {
      type: DataTypes.ENUM(
        "late",
        "absent",
        "overtime",
        "movement_overstay",
        "none"
      ),
      defaultValue: "none",
    },

    penaltyRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },

    penaltyAmount: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },

    earlyClockOut: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    earlyClockOutReason: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

Staff.hasMany(Attendance, {
  foreignKey: "StaffId",
});

Attendance.belongsTo(Staff, {
  foreignKey: "StaffId",
});

Attendance.associate = (models) => {
  Attendance.belongsTo(models.Staff, {
    foreignKey: "StaffId",
    as: "staff",
  });

  Attendance.hasMany(models.StaffPenalty, {
    foreignKey: "AttendanceId",
    as: "penalties",
  });
};

module.exports = Attendance;