const User = require("../../models/User");
const bcrypt = require("bcrypt");
const validator = require("validator");
const generateToken = require("../../utils/jwt");

const register = async (req, res) => {
    try {

        const {
            fullname,
            email,
            phone,
            password,
            role
        } = req.body;

        if (
            !fullname ||
            !email ||
            !phone ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters"
            });
        }

        const existingUser =
            await User.findOne({
                where: { email }
            });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "Email already exists"
            });
        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        const user =
            await User.create({
                fullname,
                email,
                phone,
                password:
                    hashedPassword,
                role:
                    role || "staff"
            });

        const token =
            generateToken(user);

        return res.status(201).json({
            success: true,
            token,
            user: {
                id: user.id,
                fullname:
                    user.fullname,
                email:
                    user.email,
                role:
                    user.role
            }
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message:
                "Server error",
                error: error.message
        });

    }
};

module.exports = register;