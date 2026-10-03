const kioskService = require("../service/kioskService");

/*
======================================================
HELPERS
======================================================
*/

/**
 * Normalize and validate QR code.
 */
const validateQRCode = (qrCode) => {
    if (
        !qrCode ||
        typeof qrCode !== "string" ||
        !qrCode.trim()
    ) {
        return false;
    }

    return true;
};

/**
 * Get a safe error message.
 */
const getErrorMessage = (error) => {
    return error?.message || "Something went wrong.";
};

/**
 * Convert service errors into suitable HTTP responses.
 */
const getErrorStatus = (error) => {
    const message = getErrorMessage(error).toLowerCase();

    if (
        message.includes("required") ||
        message.includes("invalid movement reason") ||
        message.includes("expected return must")
    ) {
        return 400;
    }

    if (
        message.includes("invalid staff card") ||
        message.includes("staff account is disabled")
    ) {
        return 404;
    }

    if (
        message.includes("already clocked") ||
        message.includes("already outside") ||
        message.includes("no active movement") ||
        message.includes("please return") ||
        message.includes("already completed")
    ) {
        return 409;
    }

    if (
        message.includes("business hours") ||
        message.includes("salon is closed")
    ) {
        return 403;
    }

    return 500;
};

/**
 * Centralized controller error response.
 */
const handleKioskError = (res, error, action) => {
    console.error(`${action} ERROR:`, error);

    const statusCode = getErrorStatus(error);

    return res.status(statusCode).json({
        success: false,
        message: getErrorMessage(error),
    });
};

/**
 * Standard success response.
 */
const successResponse = (
    res,
    statusCode,
    message,
    data = {}
) => {
    return res.status(statusCode).json({
        success: true,
        message,
        ...data,
    });
};

/*
======================================================
SCAN QR CODE
======================================================
*/

exports.scanQRCode = async (req, res) => {
    try {
        const { qrCode } = req.body || {};

        if (!validateQRCode(qrCode)) {
            return res.status(400).json({
                success: false,
                message: "QR Code is required.",
            });
        }

        const result = await kioskService.scanQRCode(
            qrCode.trim()
        );

        return successResponse(
            res,
            200,
            "Staff card scanned successfully.",
            result
        );
    } catch (error) {
        return handleKioskError(
            res,
            error,
            "SCAN QR CODE"
        );
    }
};

/*
======================================================
CLOCK IN
======================================================
*/

exports.clockIn = async (req, res) => {
    try {
        const { qrCode } = req.body || {};

        if (!validateQRCode(qrCode)) {
            return res.status(400).json({
                success: false,
                message: "QR Code is required.",
            });
        }

        const result = await kioskService.clockIn(
            qrCode.trim()
        );

        return successResponse(
            res,
            201,
            "Clock-in successful.",
            result
        );
    } catch (error) {
        return handleKioskError(
            res,
            error,
            "CLOCK IN"
        );
    }
};

/*
======================================================
GO OUT
======================================================
*/

exports.goOut = async (req, res) => {
    try {
        const {
            qrCode,
            reason,
            expectedReturn,
        } = req.body || {};

        if (!validateQRCode(qrCode)) {
            return res.status(400).json({
                success: false,
                message: "QR Code is required.",
            });
        }

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: "Movement reason is required.",
            });
        }

        const result = await kioskService.goOut({
            qrCode: qrCode.trim(),
            reason,
            expectedReturn,
        });

        return successResponse(
            res,
            201,
            "Movement recorded successfully.",
            result
        );
    } catch (error) {
        return handleKioskError(
            res,
            error,
            "GO OUT"
        );
    }
};

/*
======================================================
RETURN BACK
======================================================
*/

exports.returnBack = async (req, res) => {
    try {
        const { qrCode } = req.body || {};

        if (!validateQRCode(qrCode)) {
            return res.status(400).json({
                success: false,
                message: "QR Code is required.",
            });
        }

        const result = await kioskService.returnBack(
            qrCode.trim()
        );

        return successResponse(
            res,
            200,
            "Welcome back.",
            result
        );
    } catch (error) {
        return handleKioskError(
            res,
            error,
            "RETURN BACK"
        );
    }
};

/*
======================================================
CLOCK OUT
======================================================
*/

exports.clockOut = async (req, res) => {
    try {
        const { qrCode } = req.body || {};

        if (!validateQRCode(qrCode)) {
            return res.status(400).json({
                success: false,
                message: "QR Code is required.",
            });
        }

        const result = await kioskService.clockOut(
            qrCode.trim()
        );

        return successResponse(
            res,
            200,
            "Clock-out successful.",
            result
        );
    } catch (error) {
        return handleKioskError(
            res,
            error,
            "CLOCK OUT"
        );
    }
};