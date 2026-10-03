const {
    createAutomaticPenalty,
} = require("./staffPenaltyService");
const Attendance = require("../models/Attendance");
const StaffMovement = require("../models/StaffMovement");
const Staff = require("../models/Staff");
const User = require("../models/User");

const {
    getTodayBusinessHours,
    getCurrentMinutes,
    timeToMinutes,
  } = require("../utils/businessHours");

/*
======================================================
HELPERS
======================================================
*/

/**
 * Important:
 * This currently uses the server's local date.
 * Ensure your VPS timezone is set to Africa/Lagos.
 */
const getToday = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getNow = () => new Date();

const normalizeQRCode = (qrCode) => {
    if (!qrCode || typeof qrCode !== "string") {
        throw new Error("QR Code is required.");
    }

    return qrCode.trim();
};

const getStaffByQRCode = async (qrCode) => {
    const normalizedQRCode = normalizeQRCode(qrCode);

    const staff = await Staff.findOne({
        where: {
            qrCode: normalizedQRCode,
        },
        include: [
            {
                model: User,
                attributes: [
                    "id",
                    "fullname",
                    "email",
                    "isActive",
                ],
            },
        ],
    });

    if (!staff) {
        throw new Error("Invalid Staff Card.");
    }

    if (staff.User && staff.User.isActive === false) {
        throw new Error(
            "This staff account is disabled. Please contact management."
        );
    }

    return staff;
};

const formatStaff = (staff) => {
    return {
        id: staff.id,
        fullname: staff.User?.fullname || "Unknown Staff",
        email: staff.User?.email || null,
        position: staff.position || null,
        qrCode: staff.qrCode,
    };
};

const getTodayAttendance = async (staffId) => {
    const attendance = await Attendance.findOne({
        where: {
            StaffId: staffId,
            attendanceDate: getToday(),
        },
        order: [
            ["createdAt", "DESC"],
        ],
    });

    // An attendance record without clock-in
    // does not count as clocked in.
    if (!attendance || !attendance.clockIn) {
        return null;
    }

    return attendance;
};

const getActiveMovement = async (staffId) => {
    return StaffMovement.findOne({
        where: {
            StaffId: staffId,
            status: "outside",
        },
        order: [
            ["createdAt", "DESC"],
        ],
    });
};

const getBusinessHours = async () => {
    const now = getNow();

    const businessHours = await getTodayBusinessHours(now);

    if (!businessHours) {
        throw new Error(
            "Business hours have not been configured for today."
        );
    }

    if (!businessHours.isOpen) {
        throw new Error("The salon is closed today.");
    }

    const openingMinutes = timeToMinutes(
        businessHours.openingTime
    );

    const closingMinutes = timeToMinutes(
        businessHours.closingTime
    );

    const gracePeriod = Number(
        businessHours.gracePeriod ?? 15
    );

    return {
        ...businessHours,
        openingMinutes,
        closingMinutes,
        gracePeriod,
    };
};



/*
======================================================
SCAN QR CODE
======================================================
*/

exports.scanQRCode = async (qrCode) => {
    const staff = await getStaffByQRCode(qrCode);

    const attendance = await getTodayAttendance(
        staff.id
    );

    const movement = await getActiveMovement(
        staff.id
    );

    const businessHours = await getBusinessHours();

    const currentMinutes = getCurrentMinutes();

    /*
    ======================================================
    BUSINESS HOURS CHECK
    ======================================================
    */

    /*
     * Do not allow attendance actions before
     * the business opening time.
     */
    if (
        currentMinutes < businessHours.openingMinutes
    ) {
        throw new Error(
            `The salon has not opened yet. Business opens at ${businessHours.openingTime}.`
        );
    }

    let nextAction;

    /*
    Staff has not clocked in today
    */
    if (!attendance) {
        nextAction = "clockin";
    }

    /*
    Staff is currently outside
    */
    else if (movement) {
        nextAction = "return";
    }

    /*
    Staff has already completed attendance
    */
    else if (attendance.clockOut) {
        nextAction = "completed";
    }

    /*
    Closing time has been reached
    */
    else if (
        currentMinutes >= businessHours.closingMinutes
    ) {
        nextAction = "clockout";
    }

    /*
    Staff has clocked in and is currently working
    */
    else {
        nextAction = "goout";
    }

    return {
        staff: formatStaff(staff),
        attendance,
        movement,
        nextAction,
        businessHours: {
            openingTime: businessHours.openingTime,
            closingTime: businessHours.closingTime,
            gracePeriod: businessHours.gracePeriod,
        },
    };
};
/*
======================================================
CLOCK IN
======================================================
*/

exports.clockIn = async (qrCode) => {
    // Find staff using QR code
    const staff = await getStaffByQRCode(qrCode);

    if (!staff) {
        throw new Error("Invalid staff QR code.");
    }

    // Check whether staff has already clocked in today
    const existingAttendance = await getTodayAttendance(
        staff.id
    );

    if (existingAttendance) {
        throw new Error(
            "You have already clocked in today."
        );
    }

    // Get today's business hours
    const businessHours = await getTodayBusinessHours();

    if (!businessHours || !businessHours.isOpen) {
        throw new Error(
            "The business is closed today."
        );
    }

    const now = new Date();

    // Current Nigeria time in minutes
    const currentMinutes = getCurrentMinutes(now);

    // Opening time from BusinessHours table
    const openingMinutes = timeToMinutes(
        businessHours.openingTime
    );

    // Grace period, for example 15 minutes
    const gracePeriod = Number(
        businessHours.gracePeriod ?? 15
    );

    const lateMinutes = Math.max(
        0,
        currentMinutes -
            (openingMinutes + gracePeriod)
    );

    const isLate = lateMinutes > 0;

    const attendanceStatus = isLate
        ? "late"
        : "present";

    const newAttendance = await Attendance.create({
        StaffId: staff.id,
        attendanceDate: getToday(),
        clockIn: now,
        status: attendanceStatus,
        lateMinutes,
        isLate,
        clockInDevice: "kiosk",
        penaltyApplied: false,
        penaltyAmount: 0,
    });

    // Apply automatic penalty if staff is late
    if (isLate) {
        await createAutomaticPenalty({
            StaffId: staff.id,

            // Important: use newAttendance.id
            AttendanceId: newAttendance.id,

            penaltyType: "late",
            reason: `Late clock-in by ${lateMinutes} minutes`,
            penaltyDate: now,
        });
    }

    return {
        staff: formatStaff(staff),
        attendance: newAttendance,
        message: isLate
            ? `Clock-in successful. You are ${lateMinutes} minutes late.`
            : "Clock-in successful.",
    };
};
/*
======================================================
GO OUT
======================================================
*/

exports.goOut = async ({
    qrCode,
    reason,
    expectedReturn,
}) => {
    const staff = await getStaffByQRCode(qrCode);

    if (!reason) {
        throw new Error(
            "Please select a reason for going out."
        );
    }

    const validReasons = [
        "restroom",
        "buy_material",
        "bank",
        "lunch",
        "official",
        "personal",
    ];

    if (!validReasons.includes(reason)) {
        throw new Error(
            "Invalid movement reason."
        );
    }

    const attendance = await getTodayAttendance(
        staff.id
    );

    if (!attendance) {
        throw new Error(
            "Please clock in before going out."
        );
    }

    if (attendance.clockOut) {
        throw new Error(
            "You have already clocked out today."
        );
    }

    const activeMovement = await getActiveMovement(
        staff.id
    );

    if (activeMovement) {
        throw new Error(
            "You are already outside."
        );
    }

    let parsedExpectedReturn = null;

    if (
        expectedReturn !== undefined &&
        expectedReturn !== null &&
        expectedReturn !== ""
    ) {
        parsedExpectedReturn = Number(
            expectedReturn
        );

        if (
            !Number.isInteger(parsedExpectedReturn) ||
            parsedExpectedReturn < 1
        ) {
            throw new Error(
                "Expected return must be a valid number of minutes."
            );
        }
    }

    const now = getNow();

    const movement = await StaffMovement.create({
        StaffId: staff.id,
        reason,
        expectedReturn: parsedExpectedReturn,
        timeOut: now,
        status: "outside",
        overStayed: false,
        overStayMinutes: 0,
        penaltyApplied: false,
        penaltyAmount: 0,
    });

    return {
        staff: formatStaff(staff),
        movement,
        message: "Movement recorded successfully.",
    };
};

/*
======================================================
RETURN BACK
======================================================
*/

exports.returnBack = async (qrCode) => {
    const staff = await getStaffByQRCode(qrCode);

    const attendance = await getTodayAttendance(
        staff.id
    );

    if (!attendance) {
        throw new Error(
            "You have not clocked in today."
        );
    }

    if (attendance.clockOut) {
        throw new Error(
            "You have already clocked out today."
        );
    }

    const movement = await getActiveMovement(
        staff.id
    );

    if (!movement) {
        throw new Error(
            "No active movement found."
        );
    }

    const now = getNow();

    const duration = Math.max(
        0,
        Math.round(
            (
                now.getTime() -
                new Date(movement.timeOut).getTime()
            ) / (1000 * 60)
        )
    );

    let overStayed = false;
    let overStayMinutes = 0;

    if (
        movement.expectedReturn &&
        duration > Number(movement.expectedReturn)
    ) {
        overStayed = true;

        overStayMinutes =
            duration -
            Number(movement.expectedReturn);
    }

    movement.timeIn = now;
    movement.duration = duration;
    movement.overStayed = overStayed;
    movement.overStayMinutes = overStayMinutes;
    movement.status = "returned";

    await movement.save();

    return {
        staff: formatStaff(staff),
        movement,
        message: overStayed
            ? `Welcome back. You overstayed by ${overStayMinutes} minutes.`
            : "Welcome back.",
    };
};

/*
======================================================
CLOCK OUT
======================================================
*/

exports.clockOut = async (qrCode) => {
    const staff = await getStaffByQRCode(qrCode);

    const attendance = await getTodayAttendance(
        staff.id
    );

    if (!attendance) {
        throw new Error(
            "Please clock in first."
        );
    }

    if (attendance.clockOut) {
        throw new Error(
            "You have already clocked out today."
        );
    }

    if (!attendance.clockIn) {
        throw new Error(
            "Clock-in time was not found."
        );
    }

    const activeMovement = await getActiveMovement(
        staff.id
    );

    if (activeMovement) {
        throw new Error(
            "Please return before clocking out."
        );
    }

    const businessHours = await getBusinessHours();

    const now = getNow();

    const totalMinutes = Math.max(
        0,
        Math.round(
            (
                now.getTime() -
                new Date(attendance.clockIn).getTime()
            ) / (1000 * 60)
        )
    );

    const workingHours = Number(
        (totalMinutes / 60).toFixed(2)
    );

    const standardHours = Number(
        businessHours.workingHours || 8
    );

    const overtime = Math.max(
        0,
        Number(
            (workingHours - standardHours).toFixed(2)
        )
    );

    attendance.clockOut = now;
    attendance.clockOutDevice = "kiosk";
    attendance.workingHours = workingHours;
    attendance.overtime = overtime;

    await attendance.save();

    return {
        staff: formatStaff(staff),
        attendance,
        message: "Clock-out successful.",
    };
};