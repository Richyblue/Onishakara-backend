const User = require("../../models/User");
const bcrypt = require("bcrypt");

const changePassword =
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

module.exports =
    changePassword;