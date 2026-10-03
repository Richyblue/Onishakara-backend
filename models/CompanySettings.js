const DataTypes = require("sequelize");
const sequelize = require("../config/db");

const CompanySettings = sequelize.define("CompanySettings", {

    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },

      // =========================
    // COMPANY INFORMATION
    // =========================

    companyName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
  
      companyPhone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
  
      companyEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
  
      companyAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
  
      // =========================
      // CURRENCY
      // =========================
  
      currency: {
        type: DataTypes.STRING(10),
        defaultValue: "NGN",
      },
  
      currencySymbol: {
        type: DataTypes.STRING(10),
        defaultValue: "₦",
      },
  
      // =========================
      // SALES / COMMISSION
      // =========================
  
      defaultCommissionRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 10,
      },
  
      loyaltyPointRate: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 1,
      },
  
      // =========================
      // INVENTORY
      // =========================
  
      lowStockThreshold: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
      },
  
      allowNegativeStock: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
  
      // =========================
      // TAX
      // =========================
  
      taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        defaultValue: 0,
      },
  
      // =========================
      // SALES APPROVAL
      // =========================
  
      autoApproveSales: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
  
      // =========================
      // RECEIPT
      // =========================
  
      receiptFooter: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      openingTime: {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: "08:00:00",
    },
    

    closingTime: {
        type: DataTypes.TIME,
        allowNull: false,
        defaultValue: "17:00:00",
    },

    workingHours: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 8.00,
    },

    gracePeriod: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 15,
    },

    overtimeEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

    earlyClockInMinutes: {
        type: DataTypes.INTEGER,
        defaultValue: 30
    },

    latePenaltyPercent: {
        type: DataTypes.DECIMAL(5,2),
        defaultValue: 10
    },
    
    overStayPenaltyPercent: {
        type: DataTypes.DECIMAL(5,2),
        defaultValue: 10
    },
    
    allowPenalty: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

    movementTrackingEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

    requireReasonForMovement: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

    qrAttendanceEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

    // ===============================
// PENALTY SETTINGS
// ===============================

penaltyRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 10,
    comment: "Penalty percentage",
  },
  
  penaltyBasis: {
    type: DataTypes.ENUM(
      "commission",
      "salary",
      "fixed_amount"
    ),
    defaultValue: "commission",
  },
  
  latePenaltyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  
  absentPenaltyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  
  movementOverstayPenaltyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  
  overtimePenaltyEnabled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  
  defaultPenaltyAmount: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },

    kioskModeEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },

    allowClockOutWithoutReturn: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },

    timezone: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Africa/Lagos",
    },


}, {

    timestamps: true

});


module.exports = CompanySettings;