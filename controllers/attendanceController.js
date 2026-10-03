const { Op } = require('sequelize')

const Attendance = require('../models/Attendance')
const StaffMovement = require('../models/StaffMovement')
const Staff = require('../models/Staff')
const User = require('../models/User')
const ActivityLog = require('../models/activityLog')


// =====================================================
// GET ATTENDANCE DASHBOARD KPIs
// =====================================================

exports.getDashboardKPIs = async (req, res) => {
  try {
    const today = new Date().toLocaleDateString(
      'en-CA',
      {
        timeZone: 'Africa/Lagos',
      },
    )

    // ---------------------------------------------
    // Present today
    // ---------------------------------------------

    const presentToday = await Attendance.count({
      where: {
        attendanceDate: today,
        clockIn: {
          [Op.ne]: null,
        },
      },
    })


    // ---------------------------------------------
    // Late today
    // ---------------------------------------------

    const lateToday = await Attendance.count({
      where: {
        attendanceDate: today,
        status: 'late',
      },
    })


    // ---------------------------------------------
    // Currently outside
    // ---------------------------------------------

    const currentlyOutside =
      await StaffMovement.count({
        where: {
          status: 'outside',
        },
      })


    // ---------------------------------------------
    // Clocked out today
    // ---------------------------------------------

    const clockedOutToday =
      await Attendance.count({
        where: {
          attendanceDate: today,
          clockOut: {
            [Op.ne]: null,
          },
        },
      })


    // ---------------------------------------------
    // Average working hours
    // ---------------------------------------------

    const workingHours =
      await Attendance.findAll({
        where: {
          attendanceDate: today,
          workingHours: {
            [Op.gt]: 0,
          },
        },
        attributes: ['workingHours'],
        raw: true,
      })


    let averageWorkingHours = 0

    if (workingHours.length > 0) {
      const totalHours =
        workingHours.reduce(
          (sum, item) =>
            sum + Number(item.workingHours || 0),
          0,
        )

      averageWorkingHours =
        Number(
          (
            totalHours /
            workingHours.length
          ).toFixed(2),
        )
    }


    // ---------------------------------------------
    // Total overtime
    // ---------------------------------------------

    const overtimeRecords =
      await Attendance.findAll({
        where: {
          attendanceDate: today,
          overtime: {
            [Op.gt]: 0,
          },
        },
        attributes: ['overtime'],
        raw: true,
      })


    const overtimeHours =
      Number(
        overtimeRecords
          .reduce(
            (sum, item) =>
              sum +
              Number(item.overtime || 0),
            0,
          )
          .toFixed(2),
      )


    // ---------------------------------------------
    // Absent today
    //
    // Active staff without attendance
    // ---------------------------------------------

    const activeStaff =
      await Staff.findAll({
        include: [
          {
            model: User,
            where: {
              isActive: true,
            },
            attributes: ['id'],
          },
        ],
        attributes: ['id'],
      })


    const attendanceToday =
      await Attendance.findAll({
        where: {
          attendanceDate: today,
        },
        attributes: ['StaffId'],
        raw: true,
      })


    const attendedStaffIds =
      new Set(
        attendanceToday.map(
          item => String(item.StaffId),
        ),
      )


    const absentToday =
      activeStaff.filter(
        staff =>
          !attendedStaffIds.has(
            String(staff.id),
          ),
      ).length


    return res.status(200).json({
      success: true,

      data: {
        presentToday,
        lateToday,
        absentToday,
        currentlyOutside,
        clockedOutToday,
        averageWorkingHours,
        overtimeHours,
      },
    })

  } catch (error) {

    console.error(
      'ATTENDANCE KPI ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// =====================================================
// GET TODAY'S ATTENDANCE
// =====================================================

exports.getTodayAttendance = async (
  req,
  res,
) => {
  try {

    const today = new Date().toLocaleDateString('en-CA', {
      timeZone: 'Africa/Lagos',
    })


    const attendance =
      await Attendance.findAll({
        where: {
          attendanceDate: today,
        },

        include: [
          {
            model: Staff,

            attributes: [
              'id',
              'position',
              'employmentType',
            ],

            include: [
              {
                model: User,

                attributes: [
                  'id',
                  'fullname',
                  'email',
                  'phone',
                ],
              },
            ],
          },
        ],

        order: [
          ['clockIn', 'ASC'],
        ],
      })


    return res.status(200).json({
      success: true,
      count: attendance.length,
      data: attendance,
    })

  } catch (error) {

    console.error(
      'TODAY ATTENDANCE ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// =====================================================
// GET STAFF ACTIVITIES
// =====================================================

exports.getStaffActivities = async (
  req,
  res,
) => {
  try {

    const limit = Math.min(
      Number(req.query.limit) || 100,
      500,
    )


    const activities =
      await ActivityLog.findAll({
        limit,

        order: [
          ['createdAt', 'DESC'],
        ],
      })


    return res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    })

  } catch (error) {

    console.error(
      'STAFF ACTIVITIES ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// =====================================================
// GET INDIVIDUAL STAFF ATTENDANCE HISTORY
// =====================================================

exports.getStaffAttendanceHistory =
  async (req, res) => {
    try {

      const { staffId } = req.params


      const staff =
        await Staff.findByPk(
          staffId,
          {
            include: [
              {
                model: User,

                attributes: [
                  'id',
                  'fullname',
                  'email',
                  'phone',
                ],
              },
            ],
          },
        )


      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff not found',
        })
      }


      const attendance =
        await Attendance.findAll({
          where: {
            StaffId: staffId,
          },

          order: [
            ['attendanceDate', 'DESC'],
          ],
        })


      const movements =
        await StaffMovement.findAll({
          where: {
            StaffId: staffId,
          },

          order: [
            ['createdAt', 'DESC'],
          ],
        })


      return res.status(200).json({
        success: true,

        data: {
          staff,
          attendance,
          movements,
        },
      })

    } catch (error) {

      console.error(
        'STAFF ATTENDANCE HISTORY ERROR:',
        error,
      )

      return res.status(500).json({
        success: false,
        message: error.message,
      })
    }
  }