const CompanySettings = require("../models/CompanySettings");

/*
======================================================
DEFAULT SETTINGS
======================================================
*/

const DEFAULT_SETTINGS = {
    companyName: "",
    companyPhone: "",
    companyEmail: "",
    companyAddress: "",

    currency: "NGN",
    currencySymbol: "₦",

    defaultCommissionRate: 10,
    loyaltyPointRate: 1,

    lowStockThreshold: 5,
    allowNegativeStock: false,

    taxRate: 0,

    autoApproveSales: true,

    receiptFooter: "",

    /*
    Attendance settings
    */
    openingTime: "08:00:00",
    closingTime: "17:00:00",
    workingHours: 8,
    gracePeriod: 15,

    overtimeEnabled: true,
    earlyClockInMinutes: 30,

    latePenaltyPercent: 10,
    overStayPenaltyPercent: 10,

    allowPenalty: true,
    movementTrackingEnabled: true,
    requireReasonForMovement: true,
    qrAttendanceEnabled: true,

    /*
    General penalty settings
    */
    penaltyRate: 10,
    penaltyBasis: "commission",

    latePenaltyEnabled: true,
    absentPenaltyEnabled: true,
    movementOverstayPenaltyEnabled: true,
    overtimePenaltyEnabled: false,

    defaultPenaltyAmount: 0,

    /*
    Kiosk settings
    */
    kioskModeEnabled: true,
    allowClockOutWithoutReturn: false,

    /*
    Business timezone
    */
    timezone: "Africa/Lagos",
};

/*
======================================================
HELPERS
======================================================
*/

const hasValue = (value) => {
    return value !== undefined && value !== null;
};

const cleanString = (value) => {
    if (value === undefined || value === null) {
        return value;
    }

    return String(value).trim();
};

const isValidEmail = (email) => {
    if (!email) {
        return true;
    }

    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email).trim()
    );
};

const isValidTime = (time) => {
    if (!time) {
        return false;
    }

    return /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(
        String(time)
    );
};

const normalizeTime = (time) => {
    const parts = String(time)
        .split(":")
        .map((part) => String(part).padStart(2, "0"));

    if (parts.length === 2) {
        return `${parts[0]}:${parts[1]}:00`;
    }

    return `${parts[0]}:${parts[1]}:${parts[2]}`;
};

const timeToMinutes = (time) => {
    const [hours, minutes] = String(time)
        .split(":")
        .map(Number);

    return hours * 60 + minutes;
};

const parseNumber = (
    value,
    fieldName,
    {
        min = 0,
        max = Number.MAX_SAFE_INTEGER,
        integer = false,
    } = {}
) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        const error = new Error(
            `${fieldName} must be a valid number.`
        );

        error.statusCode = 400;
        throw error;
    }

    if (number < min) {
        const error = new Error(
            `${fieldName} cannot be less than ${min}.`
        );

        error.statusCode = 400;
        throw error;
    }

    if (number > max) {
        const error = new Error(
            `${fieldName} cannot be greater than ${max}.`
        );

        error.statusCode = 400;
        throw error;
    }

    if (integer && !Number.isInteger(number)) {
        const error = new Error(
            `${fieldName} must be a whole number.`
        );

        error.statusCode = 400;
        throw error;
    }

    return number;
};

const parseBoolean = (value, fieldName) => {
    if (typeof value === "boolean") {
        return value;
    }

    if (
        value === "true" ||
        value === "1" ||
        value === 1
    ) {
        return true;
    }

    if (
        value === "false" ||
        value === "0" ||
        value === 0
    ) {
        return false;
    }

    const error = new Error(
        `${fieldName} must be true or false.`
    );

    error.statusCode = 400;
    throw error;
};

const validatePercentage = (
    value,
    fieldName
) => {
    return parseNumber(value, fieldName, {
        min: 0,
        max: 100,
    });
};

const getOrCreateSettings = async () => {
    let settings = await CompanySettings.findOne();

    if (!settings) {
        settings = await CompanySettings.create(
            DEFAULT_SETTINGS
        );
    }

    return settings;
};

const handleError = (
    res,
    error,
    action
) => {
    console.error(`${action} ERROR:`, error);

    const statusCode =
        error.statusCode ||
        (
            error.name === "SequelizeValidationError"
                ? 400
                : 500
        );

    return res.status(statusCode).json({
        success: false,
        message:
            statusCode === 500
                ? "Something went wrong while processing company settings."
                : error.message,
    });
};

/*
======================================================
GET SETTINGS
======================================================
*/

exports.getSettings = async (req, res) => {
    try {
        const settings =
            await getOrCreateSettings();

        return res.status(200).json({
            success: true,
            settings,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "GET SETTINGS"
        );
    }
};

/*
======================================================
UPDATE SETTINGS
======================================================
*/

exports.updateSettings = async (req, res) => {
    try {
        const body = req.body || {};

        const settings =
            await getOrCreateSettings();

        /*
        ==============================================
        COMPANY INFORMATION
        ==============================================
        */

        if (hasValue(body.companyName)) {
            settings.companyName =
                cleanString(body.companyName);
        }

        if (hasValue(body.companyPhone)) {
            settings.companyPhone =
                cleanString(body.companyPhone);
        }

        if (hasValue(body.companyEmail)) {
            const companyEmail =
                cleanString(body.companyEmail);

            if (
                companyEmail &&
                !isValidEmail(companyEmail)
            ) {
                const error = new Error(
                    "Please provide a valid company email."
                );

                error.statusCode = 400;
                throw error;
            }

            settings.companyEmail =
                companyEmail;
        }

        if (hasValue(body.companyAddress)) {
            settings.companyAddress =
                cleanString(body.companyAddress);
        }

        /*
        ==============================================
        CURRENCY
        ==============================================
        */

        if (hasValue(body.currency)) {
            const currency =
                cleanString(body.currency)
                    .toUpperCase();

            if (!/^[A-Z]{3,10}$/.test(currency)) {
                const error = new Error(
                    "Currency must contain valid letters."
                );

                error.statusCode = 400;
                throw error;
            }

            settings.currency = currency;
        }

        if (hasValue(body.currencySymbol)) {
            const currencySymbol =
                cleanString(body.currencySymbol);

            if (!currencySymbol) {
                const error = new Error(
                    "Currency symbol cannot be empty."
                );

                error.statusCode = 400;
                throw error;
            }

            settings.currencySymbol =
                currencySymbol;
        }

        /*
        ==============================================
        SALES / COMMISSION
        ==============================================
        */

        if (
            hasValue(
                body.defaultCommissionRate
            )
        ) {
            settings.defaultCommissionRate =
                validatePercentage(
                    body.defaultCommissionRate,
                    "Default commission rate"
                );
        }

        if (
            hasValue(body.loyaltyPointRate)
        ) {
            settings.loyaltyPointRate =
                parseNumber(
                    body.loyaltyPointRate,
                    "Loyalty point rate",
                    {
                        min: 0,
                        max: 100,
                    }
                );
        }

        /*
        ==============================================
        INVENTORY
        ==============================================
        */

        if (
            hasValue(body.lowStockThreshold)
        ) {
            settings.lowStockThreshold =
                parseNumber(
                    body.lowStockThreshold,
                    "Low stock threshold",
                    {
                        min: 0,
                        integer: true,
                    }
                );
        }

        if (
            hasValue(body.allowNegativeStock)
        ) {
            settings.allowNegativeStock =
                parseBoolean(
                    body.allowNegativeStock,
                    "Allow negative stock"
                );
        }

        /*
        ==============================================
        TAX
        ==============================================
        */

        if (hasValue(body.taxRate)) {
            settings.taxRate =
                validatePercentage(
                    body.taxRate,
                    "Tax rate"
                );
        }

        /*
        ==============================================
        SALES APPROVAL
        ==============================================
        */

        if (
            hasValue(body.autoApproveSales)
        ) {
            settings.autoApproveSales =
                parseBoolean(
                    body.autoApproveSales,
                    "Auto approve sales"
                );
        }

        /*
        ==============================================
        RECEIPT
        ==============================================
        */

        if (hasValue(body.receiptFooter)) {
            settings.receiptFooter =
                cleanString(body.receiptFooter);
        }

        /*
        ==============================================
        ATTENDANCE TIME SETTINGS
        ==============================================
        */

        let openingTime =
            settings.openingTime;

        let closingTime =
            settings.closingTime;

        if (
            hasValue(body.openingTime) &&
            body.openingTime !== ""
        ) {
            if (
                !isValidTime(body.openingTime)
            ) {
                const error = new Error(
                    "Opening time must be in HH:mm or HH:mm:ss format."
                );

                error.statusCode = 400;
                throw error;
            }

            openingTime =
                normalizeTime(body.openingTime);
        }

        if (
            hasValue(body.closingTime) &&
            body.closingTime !== ""
        ) {
            if (
                !isValidTime(body.closingTime)
            ) {
                const error = new Error(
                    "Closing time must be in HH:mm or HH:mm:ss format."
                );

                error.statusCode = 400;
                throw error;
            }

            closingTime =
                normalizeTime(body.closingTime);
        }

        if (
            openingTime &&
            closingTime
        ) {
            const openingMinutes =
                timeToMinutes(openingTime);

            const closingMinutes =
                timeToMinutes(closingTime);

            if (
                closingMinutes <= openingMinutes
            ) {
                const error = new Error(
                    "Closing time must be later than opening time."
                );

                error.statusCode = 400;
                throw error;
            }
        }

        settings.openingTime =
            openingTime;

        settings.closingTime =
            closingTime;

        if (
            hasValue(body.workingHours) &&
            body.workingHours !== ""
        ) {
            settings.workingHours =
                parseNumber(
                    body.workingHours,
                    "Working hours",
                    {
                        min: 0.1,
                        max: 24,
                    }
                );
        }

        if (
            hasValue(body.gracePeriod) &&
            body.gracePeriod !== ""
        ) {
            settings.gracePeriod =
                parseNumber(
                    body.gracePeriod,
                    "Grace period",
                    {
                        min: 0,
                        max: 1440,
                        integer: true,
                    }
                );
        }

        /*
        ==============================================
        OVERTIME SETTINGS
        ==============================================
        */

        if (
            hasValue(body.overtimeEnabled)
        ) {
            settings.overtimeEnabled =
                parseBoolean(
                    body.overtimeEnabled,
                    "Overtime enabled"
                );
        }

        if (
            hasValue(body.earlyClockInMinutes)
        ) {
            settings.earlyClockInMinutes =
                parseNumber(
                    body.earlyClockInMinutes,
                    "Early clock-in minutes",
                    {
                        min: 0,
                        max: 1440,
                        integer: true,
                    }
                );
        }

        /*
        ==============================================
        LEGACY ATTENDANCE PENALTIES
        ==============================================
        */

        if (
            hasValue(body.latePenaltyPercent)
        ) {
            settings.latePenaltyPercent =
                validatePercentage(
                    body.latePenaltyPercent,
                    "Late penalty percent"
                );
        }

        if (
            hasValue(body.overStayPenaltyPercent)
        ) {
            settings.overStayPenaltyPercent =
                validatePercentage(
                    body.overStayPenaltyPercent,
                    "Overstay penalty percent"
                );
        }

        if (
            hasValue(body.allowPenalty)
        ) {
            settings.allowPenalty =
                parseBoolean(
                    body.allowPenalty,
                    "Allow penalty"
                );
        }

        if (
            hasValue(body.movementTrackingEnabled)
        ) {
            settings.movementTrackingEnabled =
                parseBoolean(
                    body.movementTrackingEnabled,
                    "Movement tracking enabled"
                );
        }

        if (
            hasValue(body.requireReasonForMovement)
        ) {
            settings.requireReasonForMovement =
                parseBoolean(
                    body.requireReasonForMovement,
                    "Require reason for movement"
                );
        }

        if (
            hasValue(body.qrAttendanceEnabled)
        ) {
            settings.qrAttendanceEnabled =
                parseBoolean(
                    body.qrAttendanceEnabled,
                    "QR attendance enabled"
                );
        }

        /*
        ==============================================
        GENERAL PENALTY SETTINGS
        ==============================================
        */

        if (hasValue(body.penaltyRate)) {
            settings.penaltyRate =
                validatePercentage(
                    body.penaltyRate,
                    "Penalty rate"
                );
        }

        if (hasValue(body.penaltyBasis)) {
            const allowedPenaltyBasis = [
                "commission",
                "salary",
                "fixed_amount",
            ];

            if (
                !allowedPenaltyBasis.includes(
                    body.penaltyBasis
                )
            ) {
                const error = new Error(
                    "Invalid penalty basis."
                );

                error.statusCode = 400;
                throw error;
            }

            settings.penaltyBasis =
                body.penaltyBasis;
        }

        if (
            hasValue(body.latePenaltyEnabled)
        ) {
            settings.latePenaltyEnabled =
                parseBoolean(
                    body.latePenaltyEnabled,
                    "Late penalty enabled"
                );
        }

        if (
            hasValue(body.absentPenaltyEnabled)
        ) {
            settings.absentPenaltyEnabled =
                parseBoolean(
                    body.absentPenaltyEnabled,
                    "Absent penalty enabled"
                );
        }

        if (
            hasValue(
                body.movementOverstayPenaltyEnabled
            )
        ) {
            settings.movementOverstayPenaltyEnabled =
                parseBoolean(
                    body.movementOverstayPenaltyEnabled,
                    "Movement overstay penalty enabled"
                );
        }

        if (
            hasValue(body.overtimePenaltyEnabled)
        ) {
            settings.overtimePenaltyEnabled =
                parseBoolean(
                    body.overtimePenaltyEnabled,
                    "Overtime penalty enabled"
                );
        }

        if (
            hasValue(body.defaultPenaltyAmount)
        ) {
            settings.defaultPenaltyAmount =
                parseNumber(
                    body.defaultPenaltyAmount,
                    "Default penalty amount",
                    {
                        min: 0,
                        max: 999999999999,
                    }
                );
        }

        /*
        ==============================================
        KIOSK SETTINGS
        ==============================================
        */

        if (
            hasValue(body.kioskModeEnabled)
        ) {
            settings.kioskModeEnabled =
                parseBoolean(
                    body.kioskModeEnabled,
                    "Kiosk mode enabled"
                );
        }

        if (
            hasValue(
                body.allowClockOutWithoutReturn
            )
        ) {
            settings.allowClockOutWithoutReturn =
                parseBoolean(
                    body.allowClockOutWithoutReturn,
                    "Allow clock-out without return"
                );
        }

        /*
        ==============================================
        TIMEZONE
        ==============================================
        */

        if (hasValue(body.timezone)) {
            const timezone =
                cleanString(body.timezone);

            if (!timezone) {
                const error = new Error(
                    "Timezone cannot be empty."
                );

                error.statusCode = 400;
                throw error;
            }

            settings.timezone = timezone;
        }

        /*
        ==============================================
        SAVE
        ==============================================
        */

        await settings.save();

        return res.status(200).json({
            success: true,
            message:
                "Company settings updated successfully.",
            settings,
        });
    } catch (error) {
        return handleError(
            res,
            error,
            "UPDATE SETTINGS"
        );
    }
};