const User = require("../models/User");
const bcrypt = require("bcrypt");
const validator = require("validator");
const generateToken = require("../utils/jwt");

exports.register = async (req, res) => {
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
                "Server error"
        });

    }
};


exports.login = async (req, res) => {
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

if (!user.isActive) {
  return res.status(403).json({
    success: false,
    message: "This staff account has been deactivated. Contact the administrator.",
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



exports.getMe = async (
    req,
    res
) => {
    try {

        const user =
            await User.findByPk(
                req.user.id,
                {
                    attributes: {
                        exclude: [
                            "password"
                        ]
                    }
                }
            );

        return res.status(200).json({
            success: true,
            user
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


exports.changePassword =
    async (req, res) => {

        try {

            const {
                oldPassword,
                newPassword
            } = req.body;

            const user =
                await User.findByPk(
                    req.user.id
                );

            const isMatch =
                await bcrypt.compare(
                    oldPassword,
                    user.password
                );

            if (!isMatch) {
                return res.status(
                    400
                ).json({
                    success:
                        false,
                    message:
                        "Old password incorrect"
                });
            }

            const hashed =
                await bcrypt.hash(
                    newPassword,
                    12
                );

            user.password =
                hashed;

            await user.save();

            return res.status(
                200
            ).json({
                success: true,
                message:
                    "Password updated"
            });

        } catch (error) {

            console.error(
                error
            );

            return res.status(
                500
            ).json({
                success: false,
                message:
                    "Server error"
            });

        }
    };


exports.deactivateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [User],
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    staff.User.isActive = false;

    await staff.User.save();

    return res.json({
      success: true,
      message: "Staff deactivated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.activateStaff = async (req, res) => {
  try {
    const staff = await Staff.findByPk(req.params.id, {
      include: [User],
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    staff.User.isActive = true;

    await staff.User.save();

    return res.json({
      success: true,
      message: "Staff activated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateStaffStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const staff = await Staff.findByPk(id, {
      include: [User],
    });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff not found",
      });
    }

    staff.User.isActive = isActive;

    await staff.User.save();

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Staff activated successfully."
        : "Staff deactivated successfully.",
      staff,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
