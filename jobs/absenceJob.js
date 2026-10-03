const cron = require("node-cron");

const Staff = require("../models/Staff");
const Attendance = require("../models/Attendance");
const User = require("../models/User");

const {
  getTodayBusinessHours,
  timeToMinutes,
} = require("../utils/businessHours");

const getToday = () => {
  return new Date().toISOString().split("T")[0];
};

const markAbsentStaff = async () => {
  try {
    const now = new Date();

    const businessHours = await getTodayBusinessHours(now);

    if (!businessHours || !businessHours.isOpen) {
      return;
    }

    const openingMinutes = timeToMinutes(
      businessHours.openingTime
    );

    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const gracePeriod = Number(
      businessHours.gracePeriod || 15
    );

    // Wait until opening time + grace period + 15 minutes
    const absenceCheckTime =
      openingMinutes + gracePeriod + 15;

    if (currentMinutes < absenceCheckTime) {
      return;
    }

    const today = getToday();

    const staffList = await Staff.findAll({
      include: [
        {
          model: User,
          where: {
            isActive: true,
          },
        },
      ],
    });

    for (const staff of staffList) {
      const existingAttendance = await Attendance.findOne({
        where: {
          StaffId: staff.id,
          attendanceDate: today,
        },
      });

      if (!existingAttendance) {
        await Attendance.create({
          StaffId: staff.id,
          attendanceDate: today,
          status: "absent",
          absent: true,
          penaltyApplied: false,
          penaltyType: "absent",
          penaltyRate: 0,
          penaltyAmount: 0,
        });
      }
    }

    console.log("Absence check completed:", today);
  } catch (error) {
    console.error("ABSENCE JOB ERROR:", error);
  }
};


// Run every 15 minutes
cron.schedule("*/15 * * * *", markAbsentStaff);