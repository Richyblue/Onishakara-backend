const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = async (
    req,
    res,
    next
) => {
    try {

        const authHeader =
            req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message:
                    "Authorization header required"
            });
        }

        const [scheme, token] =
            authHeader.split(" ");

        if (
            scheme !== "Bearer" ||
            !token
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid authorization format"
            });
        }

        let decoded;

        try {

            decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        } catch (error) {

            if (
                error.name ===
                "TokenExpiredError"
            ) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Token expired"
                });
            }

            return res.status(401).json({
                success: false,
                message:
                    "Invalid token"
            });
        }

        const user =
            await User.findByPk(
                decoded.id,
                {
                    attributes: [
                        "id",
                        "fullname",
                        "email",
                        "role",
                        "isActive"
                    ]
                }
            );

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "User not found"
            });
        }

        if (!user.isActive) {
            return res.status(402).json({
                success: false,
                message:
                    "Your account has been disabled. Please contact the administrator."
            });
        }

        req.user = user;

        next();

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Internal server error"
        });
    }
};

module.exports = authMiddleware;