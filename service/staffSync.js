const db =require('../config/offlineDb');
const Staff = require('../models/Staff');
const User = require('../models/User');


async function syncStaff() {

  try {

    const staffs =
      await Staff.findAll({

        include:[
          {
            model:User,
            attributes:[
              'id',
              'fullname',
              'email',
              'phone',
              'role',
              'isActive'
            ]
          }
        ]

      });

    for(
      const staff
      of staffs
    ){

      db.run(
      `
      INSERT OR REPLACE INTO staffs (
          id,
          userId,
          fullname,
          email,
          phone,
          role,
          isActive,
          position,
          salary,
          employmentType,
          hmoProvider,
          hmoNumber,
          commissionRate,
          commissionCycle
      )
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      `,
      [
        staff.id,

        staff.User?.id,

        staff.User?.fullname,

        staff.User?.email,

        staff.User?.phone,

        staff.User?.role,

        staff.User?.isActive,

        staff.position,

        staff.salary,

        staff.employmentType,

        staff.hmoProvider,

        staff.hmoNumber,

        staff.commissionRate,

        staff.commissionCycle

      ]);

    }

  } catch(error){

    console.error(
      'Staff Sync Error:',
      error
    );

  }

}

module.exports =
syncStaff;