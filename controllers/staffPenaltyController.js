const { Op } = require("sequelize");

const {
createAutomaticPenalty,
} = require("../service/staffPenaltyService");
const {
  Staff,
  User,
  StaffPenalty,
  Attendance,
  StaffMovement,
} = require("../models");
// const StaffPenalty = require("../models/StaffPenalty");
// const Staff = require("../models/Staff");
// const Attendance = require("../models/Attendance");
// const StaffMovement = require("../models/StaffMovement");


// GET ALL STAFF PENALTIES
exports.getAllPenalties = async (req, res) => {
  try {
    const { search, status, startDate, endDate } = req.query;

    // Always declare whereClause before using it
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [
          new Date(`${startDate} 00:00:00`),
          new Date(`${endDate} 23:59:59`)
        ]
      };
    }

    const include = [
      {
        model: Staff,
        as: "staff",
        required: false,
        include: [
          {
            model: User,
            as: "user",
            required: false,
            attributes: [
              "id",
              "firstName",
              "lastName",
              "email",
              "phone"
            ]
          }
        ]
      }
    ];

    // Search staff details through the User relationship
    if (search) {
      include[0].required = true;
      include[0].include[0].required = true;

      whereClause[Op.or] = [
        { "$staff.user.firstName$": { [Op.like]: `%${search}%` } },
        { "$staff.user.lastName$": { [Op.like]: `%${search}%` } },
        { "$staff.user.email$": { [Op.like]: `%${search}%` } },
        { "$staff.user.phone$": { [Op.like]: `%${search}%` } }
      ];
    }

    const penalties = await StaffPenalty.findAll({
      where: whereClause,
      include,
      order: [["createdAt", "DESC"]]
    });

    return res.status(200).json({
      success: true,
      count: penalties.length,
      data: penalties
    });
  } catch (error) {
    console.error("Get staff penalties error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff penalties",
      error: error.message
    });
  }
};
// GET SINGLE PENALTY
exports.getPenaltyById = async (req, res) => {
  try {
    const penalty = await StaffPenalty.findByPk(
      req.params.id,
      {
        include: [
          {
            model: Staff,
            required: false,
          },
          {
            model: Attendance,
            required: false,
          },
          {
            model: StaffMovement,
            required: false,
          },
        ],
      }
    );

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: "Staff penalty not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: penalty,
    });
  } catch (error) {
    console.error("Get penalty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch staff penalty",
      error: error.message,
    });
  }
};


// PENALTY SUMMARY
exports.getPenaltySummary = async (req, res) => {
  try {
    const [total, pending, approved, deducted, waived] =
      await Promise.all([
        StaffPenalty.count(),

        StaffPenalty.count({
          where: { status: "pending" },
        }),

        StaffPenalty.count({
          where: { status: "approved" },
        }),

        StaffPenalty.count({
          where: { status: "deducted" },
        }),

        StaffPenalty.count({
          where: { status: "waived" },
        }),
      ]);

    const totalAmount =
      (await StaffPenalty.sum("penaltyAmount")) || 0;

    const deductedAmount =
      (await StaffPenalty.sum("penaltyAmount", {
        where: {
          status: "deducted",
        },
      })) || 0;

    return res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        approved,
        deducted,
        waived,
        totalAmount,
        deductedAmount,
      },
    });
  } catch (error) {
    console.error("Penalty summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch penalty summary",
      error: error.message,
    });
  }
};


// UPDATE PENALTY
exports.updatePenalty = async (req, res) => {
  try {
    const penalty = await StaffPenalty.findByPk(
      req.params.id
    );

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: "Staff penalty not found",
      });
    }

    const {
      penaltyRate,
      baseAmount,
      penaltyAmount,
      reason,
      status,
    } = req.body;

    await penalty.update({
      penaltyRate,
      baseAmount,
      penaltyAmount,
      reason,
      status,
    });

    return res.status(200).json({
      success: true,
      message: "Staff penalty updated successfully",
      data: penalty,
    });
  } catch (error) {
    console.error("Update penalty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update staff penalty",
      error: error.message,
    });
  }
};


// APPROVE PENALTY
exports.approvePenalty = async (req, res) => {
  try {
    const penalty = await StaffPenalty.findByPk(
      req.params.id
    );

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: "Staff penalty not found",
      });
    }

    if (penalty.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Only pending penalties can be approved",
      });
    }

    await penalty.update({
      status: "approved",
    });

    return res.status(200).json({
      success: true,
      message: "Penalty approved successfully",
      data: penalty,
    });
  } catch (error) {
    console.error("Approve penalty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve penalty",
      error: error.message,
    });
  }
};


// MARK PENALTY AS DEDUCTED
exports.markPenaltyAsDeducted = async (req, res) => {
  try {
    const penalty = await StaffPenalty.findByPk(
      req.params.id
    );

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: "Staff penalty not found",
      });
    }

    if (penalty.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved penalties can be deducted",
      });
    }

    await penalty.update({
      status: "deducted",
    });

    return res.status(200).json({
      success: true,
      message: "Penalty marked as deducted",
      data: penalty,
    });
  } catch (error) {
    console.error("Deduct penalty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark penalty as deducted",
      error: error.message,
    });
  }
};


// WAIVE PENALTY
exports.waivePenalty = async (req, res) => {
  try {
    const penalty = await StaffPenalty.findByPk(
      req.params.id
    );

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: "Staff penalty not found",
      });
    }

    if (penalty.status === "deducted") {
      return res.status(400).json({
        success: false,
        message: "A deducted penalty cannot be waived",
      });
    }

    await penalty.update({
      status: "waived",
    });

    return res.status(200).json({
      success: true,
      message: "Penalty waived successfully",
      data: penalty,
    });
  } catch (error) {
    console.error("Waive penalty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to waive penalty",
      error: error.message,
    });
  }
};


// DELETE PENALTY
exports.deletePenalty = async (req, res) => {
  try {
    const penalty = await StaffPenalty.findByPk(
      req.params.id
    );

    if (!penalty) {
      return res.status(404).json({
        success: false,
        message: "Staff penalty not found",
      });
    }

    await penalty.destroy();

    return res.status(200).json({
      success: true,
      message: "Staff penalty deleted successfully",
    });
  } catch (error) {
    console.error("Delete penalty error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete staff penalty",
      error: error.message,
    });
  }
};

// CREATE AUTOMATIC STAFF PENALTY
exports.createAutomaticPenalty = async (req, res) => {
  try {
    const {
      StaffId,
      AttendanceId,
      StaffMovementId,
      penaltyType,
      reason,
      penaltyDate,
    } = req.body;

    if (!StaffId) {
      return res.status(400).json({
        success: false,
        message: "StaffId is required",
      });
    }

    if (!penaltyType) {
      return res.status(400).json({
        success: false,
        message: "Penalty type is required",
      });
    }

    const allowedPenaltyTypes = [
      "late",
      "absent",
      "overtime",
      "movement_overstay",
      "early_clockout",
    ];

    if (!allowedPenaltyTypes.includes(penaltyType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid penalty type",
      });
    }

    const staff = await Staff.findByPk(StaffId);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    /*
     * The service will:
     * - Check employmentType
     * - Select salary or commission
     * - Calculate penalty
     * - Prevent duplicate penalty
     * - Create StaffPenalty record
     */
    const penalty = await createAutomaticPenalty({
      StaffId,
      AttendanceId: AttendanceId || null,
      StaffMovementId: StaffMovementId || null,
      penaltyType,
      reason:
        reason || `Automatic penalty for ${penaltyType}`,
      penaltyDate: penaltyDate || new Date(),
    });

    if (!penalty) {
      return res.status(200).json({
        success: true,
        message:
          "No penalty was created. The penalty may be disabled, zero, or already exists.",
        data: null,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Automatic penalty created successfully",
      data: penalty,
    });
  } catch (error) {
    console.error(
      "Create automatic penalty error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create automatic penalty",
      error: error.message,
    });
  }
};