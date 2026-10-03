const { Op } = require("sequelize");

const Attendance = require("../models/Attendance");

const StaffMovement = require("../models/StaffMovement");

const Staff = require("../models/Staff");

const User = require("../models/User");

const CompanySettings = require("../models/CompanySettings");

const getToday = () => {

    return new Date().toISOString().split("T")[0];

};

/*
==========================================
ATTENDANCE DASHBOARD
==========================================
*/

exports.dashboard = async () => {

    const today = getToday();

    /*
    PRESENT
    */

    const present = await Attendance.count({

        where:{

            attendanceDate:today

        }

    });

    /*
    LATE
    */

    const late = await Attendance.count({

        where:{

            attendanceDate:today,

            isLate:true

        }

    });

    /*
    CLOCKED OUT
    */

    const clockedOut = await Attendance.count({

        where:{

            attendanceDate:today,

            clockOut:{

                [Op.not]:null

            }

        }

    });

    /*
    OUTSIDE
    */

    const outside = await StaffMovement.count({

        where:{

            status:"outside"

        }

    });

    /*
    OVERSTAYED
    */

    const overstayed = await StaffMovement.count({

        where:{

            status:"outside",

            overStayed:true

        }

    });

    /*
    PENALTY
    */

    const penalties = await Attendance.sum(

        "penaltyAmount",

        {

            where:{

                attendanceDate:today

            }

        }

    );

    /*
    AVERAGE HOURS
    */

    const attendance = await Attendance.findAll({

        where:{

            attendanceDate:today

        }

    });

    let averageHours = 0;

    if(attendance.length){

        averageHours =

        attendance.reduce(

            (sum,item)=>

            sum +

            Number(item.workingHours||0),

            0

        )/

        attendance.length;

    }

    return{

        present,

        late,

        outside,

        clockedOut,

        overstayed,

        penalties:penalties||0,

        averageHours:Number(

            averageHours.toFixed(2)

        )

    };

};

/*
==========================================
ATTENDANCE REPORT
==========================================
*/

exports.attendanceReport = async (query) => {

    const { period = "today", startDate, endDate } = query;

    const where = {};

    const now = new Date();

    if (period === "today") {

        where.attendanceDate = now.toISOString().split("T")[0];

    }

    if (period === "month") {

        where.attendanceDate = {

            [Op.gte]: new Date(

                now.getFullYear(),

                now.getMonth(),

                1

            )

        };

    }

    if (

        period === "custom" &&

        startDate &&

        endDate

    ) {

        where.attendanceDate = {

            [Op.between]: [

                startDate,

                endDate

            ]

        };

    }

    const attendance = await Attendance.findAll({

        where,

        include:[

            {

                model:Staff,

                include:[

                    {

                        model:User,

                        attributes:[

                            "fullname",

                            "email"

                        ]

                    }

                ]

            }

        ],

        order:[

            [

                "attendanceDate",

                "DESC"

            ]

        ]

    });

    return{

        totalAttendance:

            attendance.length,

        attendance

    };

};

/*
==========================================
MOVEMENT REPORT
==========================================
*/

exports.movementReport = async (query) => {

    const { period = "today", startDate, endDate } = query;

    const where = {};

    const now = new Date();

    if (period === "today") {

        where.createdAt = {

            [Op.between]: [

                new Date(

                    now.setHours(0,0,0,0)

                ),

                new Date(

                    now.setHours(23,59,59,999)

                )

            ]

        };

    }

    if (

        period==="custom" &&

        startDate &&

        endDate

    ){

        where.createdAt={

            [Op.between]:[

                startDate,

                new Date(

                    `${endDate}T23:59:59`

                )

            ]

        };

    }

    const movement=

        await StaffMovement.findAll({

            where,

            include:[

                {

                    model:Staff,

                    include:[

                        {

                            model:User,

                            attributes:[

                                "fullname"

                            ]

                        }

                    ]

                }

            ],

            order:[

                [

                    "createdAt",

                    "DESC"

                ]

            ]

        });

    return{

        totalMovement:

            movement.length,

        movement

    };

};