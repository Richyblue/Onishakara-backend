const User = require("../../models/User");

const getMe = async (
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

module.exports = getMe;