const LeaveRequest = require("../models/leaveRequest");

exports.applyLeave = async (req, res) => {
    try {

        const {
            startDate,
            endDate,
            reason
        } = req.body;

        const leave = await LeaveRequest.create({
            StaffId: req.user.staffId,
            startDate,
            endDate,
            reason
        });

        return res.status(201).json({
            success: true,
            leave
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};


exports.approveLeave = async (req, res) => {
    try {

        const leave = await LeaveRequest.findByPk(
            req.params.id
        );

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave request not found"
            });
        }

        leave.status = "approved";

        await leave.save();

        return res.status(200).json({
            success: true,
            message: "Leave approved"
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
