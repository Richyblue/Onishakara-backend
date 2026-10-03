const User = require("../../models/User");
const bcrypt = require("bcrypt");
const generateToken = require("../../utils/jwt");

const login = async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;

        if (
            !email ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password required"
            });
        }

        const user =
            await User.findOne({
                where: { email }
            });

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid credentials"
            });
        }

        const isMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid credentials"
            });
        }

        const token =
            generateToken(user);

        return res.status(200).json({
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
                "Server error"
        });

    }
};

module.exports = login;