const { Op } = require("sequelize");

const StaffPenalty = require("../models/StaffPenalty");
const Staff = require("../models/Staff");
const CompanySettings = require("../models/CompanySettings");

/**
 * CREATE AUTOMATIC STAFF PENALTY
 */
const createAutomaticPenalty = async ({
  StaffId,
  AttendanceId = null,
  StaffMovementId = null,
  penaltyType,
  reason,
  penaltyDate = new Date(),
}) => {
  try {
    // Find staff
    const staff = await Staff.findByPk(StaffId);

    if (!staff) {
      throw new Error("Staff not found");
    }

    // Get company settings
    const settings = await CompanySettings.findOne();

    if (!settings) {
      throw new Error(
        "Company settings have not been configured"
      );
    }

    /*
     * Check whether this penalty type is enabled
     */
    if (
      penaltyType === "late" &&
      settings.latePenaltyEnabled === false
    ) {
      return null;
    }

    if (
      penaltyType === "absent" &&
      settings.absentPenaltyEnabled === false
    ) {
      return null;
    }

    if (
      penaltyType === "movement_overstay" &&
      settings.movementOverstayPenaltyEnabled === false
    ) {
      return null;
    }

    if (
      penaltyType === "overtime" &&
      settings.overtimePenaltyEnabled === false
    ) {
      return null;
    }

    /*
     * Prevent duplicate penalty records
     */
    const duplicateWhere = {
      StaffId,
      penaltyType,
    };

    if (AttendanceId) {
      duplicateWhere.AttendanceId = AttendanceId;
    }

    if (StaffMovementId) {
      duplicateWhere.StaffMovementId = StaffMovementId;
    }

    const existingPenalty = await StaffPenalty.findOne({
      where: duplicateWhere,
    });

    if (existingPenalty) {
      return existingPenalty;
    }

    /*
     * Determine employment type
     */
    const employmentType = String(
      staff.employmentType || ""
    ).toLowerCase();

    let baseAmount = 0;
    let deductionSource = null;

    if (employmentType === "salary") {
      baseAmount = Number(
        staff.salary ||
        staff.monthlySalary ||
        staff.salaryAmount ||
        0
      );

      deductionSource = "salary";
    } else if (employmentType === "commission") {
      /*
       * This should normally be the commission earned
       * during the applicable period.
       */
      baseAmount = Number(
        staff.commission ||
        staff.totalCommission ||
        staff.commissionAmount ||
        0
      );

      deductionSource = "commission";
    } else {
      throw new Error(
        `Unsupported employment type: ${staff.employmentType}`
      );
    }

    /*
     * Determine penalty rate
     */
    const penaltyRate = Number(
      settings.penaltyRate ||
      settings.defaultCommissionRate ||
      0
    );

    let penaltyAmount = 0;

    if (settings.penaltyBasis === "fixed_amount") {
      penaltyAmount = Number(
        settings.defaultPenaltyAmount || 0
      );
    } else {
      penaltyAmount =
        (baseAmount * penaltyRate) / 100;
    }

    /*
     * Do not create zero-value penalties
     */
    if (penaltyAmount <= 0) {
      return null;
    }

    /*
     * Create penalty record
     */
    const penalty = await StaffPenalty.create({
      StaffId,
      AttendanceId,
      StaffMovementId,
      penaltyType,
      penaltyRate,
      baseAmount,
      penaltyAmount,
      deductionSource,
      reason,
      penaltyDate,
      status: "pending",
    });

    return penalty;
  } catch (error) {
    console.error(
      "Automatic penalty service error:",
      error
    );

    throw error;
  }
};

module.exports = {
  createAutomaticPenalty,
};