const bcrypt = require('bcryptjs')
const crypto = require('crypto')
const QRCode = require('qrcode')
const sequelize = require('../config/db')

const User = require('../models/User')
const Staff = require('../models/Staff')


// ============================================================
// GENERATE UNIQUE STAFF QR TOKEN
// ============================================================

const generateStaffQRCode = () => {
  return `ONI-${crypto
    .randomBytes(12)
    .toString('hex')
    .toUpperCase()}`
}


// ============================================================
// CREATE STAFF
// ============================================================

exports.createStaff = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const {
      fullname,
      email,
      phone,
      password,
      role,
      position,
      salary,
      employmentType,
    } = req.body

    // --------------------------------------------------------
    // Validate required fields
    // --------------------------------------------------------

    if (
      !fullname ||
      !email ||
      !password ||
      !role
    ) {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message:
          'Fullname, email, password and role are required',
      })
    }

    // --------------------------------------------------------
    // Normalize input
    // --------------------------------------------------------

    const cleanFullname = String(fullname).trim()
    const cleanEmail = String(email).trim().toLowerCase()
    const cleanPhone = phone
      ? String(phone).trim()
      : null

    const cleanPosition = position
      ? String(position).trim()
      : null

    const cleanEmploymentType = employmentType
      ? String(employmentType).trim()
      : 'salary'

    // --------------------------------------------------------
    // Validate password
    // --------------------------------------------------------

    if (String(password).length < 6) {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 6 characters long',
      })
    }

    // --------------------------------------------------------
    // Validate salary
    // --------------------------------------------------------

    let cleanSalary = null

    if (
      salary !== undefined &&
      salary !== null &&
      salary !== ''
    ) {
      cleanSalary = Number(salary)

      if (
        Number.isNaN(cleanSalary) ||
        cleanSalary < 0
      ) {
        await transaction.rollback()

        return res.status(400).json({
          success: false,
          message: 'Salary must be a valid amount',
        })
      }
    }

    // --------------------------------------------------------
    // Check existing user
    // --------------------------------------------------------

    const existingUser = await User.findOne({
      where: {
        email: cleanEmail,
      },
      transaction,
    })

    if (existingUser) {
      await transaction.rollback()

      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      })
    }

    // --------------------------------------------------------
    // Hash password
    // --------------------------------------------------------

    const hashedPassword = await bcrypt.hash(
      password,
      10,
    )

    // --------------------------------------------------------
    // Create User
    // --------------------------------------------------------

    const user = await User.create(
      {
        fullname: cleanFullname,
        email: cleanEmail,
        phone: cleanPhone,
        password: hashedPassword,
        role,
        isActive: true,
      },
      {
        transaction,
      },
    )

    // --------------------------------------------------------
    // Generate Staff QR
    // --------------------------------------------------------

    const qrCode = generateStaffQRCode()

    // --------------------------------------------------------
    // Create Staff
    // --------------------------------------------------------

    const staff = await Staff.create(
      {
        UserId: user.id,
        position: cleanPosition,
        salary: cleanSalary,
        employmentType: cleanEmploymentType,
        qrCode,
      },
      {
        transaction,
      },
    )

    // --------------------------------------------------------
    // Commit
    // --------------------------------------------------------

    await transaction.commit()

    return res.status(201).json({
      success: true,
      message: 'Staff created successfully',

      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
      },

      staff,

      qrCode,
    })

  } catch (error) {

    if (!transaction.finished) {
      await transaction.rollback()
    }

    console.error(
      'CREATE STAFF ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// ============================================================
// GET ALL STAFF
// ============================================================

exports.getStaff = async (req, res) => {
  try {

    const staffs = await Staff.findAll({
      include: [
        {
          model: User,
          attributes: [
            'id',
            'fullname',
            'email',
            'phone',
            'role',
            'isActive',
          ],
        },
      ],

      order: [
        ['createdAt', 'DESC'],
      ],
    })

    return res.status(200).json({
      success: true,
      staffs,
    })

  } catch (error) {

    console.error(
      'GET STAFF ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// ============================================================
// GET SINGLE STAFF
// ============================================================

exports.getSingleStaff = async (req, res) => {
  try {

    const staff = await Staff.findByPk(
      req.params.id,
      {
        include: [
          {
            model: User,
            attributes: [
              'id',
              'fullname',
              'email',
              'phone',
              'role',
              'isActive',
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

    return res.status(200).json({
      success: true,
      staff,
    })

  } catch (error) {

    console.error(
      'GET SINGLE STAFF ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// ============================================================
// UPDATE STAFF
// ============================================================

exports.updateStaff = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {

    const { id } = req.params

    const {
      fullname,
      email,
      phone,
      role,
      password,
      position,
      salary,
      employmentType,
    } = req.body

    // --------------------------------------------------------
    // Find staff
    // --------------------------------------------------------

    const staff = await Staff.findByPk(
      id,
      {
        include: [
          {
            model: User,
          },
        ],
        transaction,
      },
    )

    if (!staff) {

      await transaction.rollback()

      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      })
    }

    const user = staff.User

    if (!user) {

      await transaction.rollback()

      return res.status(404).json({
        success: false,
        message:
          'Staff user account not found',
      })
    }

    // --------------------------------------------------------
    // Normalize email
    // --------------------------------------------------------

    const cleanEmail = email
      ? String(email).trim().toLowerCase()
      : user.email

    // --------------------------------------------------------
    // Check duplicate email
    // --------------------------------------------------------

    const existingUser = await User.findOne({
      where: {
        email: cleanEmail,
      },
      transaction,
    })

    if (
      existingUser &&
      existingUser.id !== user.id
    ) {

      await transaction.rollback()

      return res.status(409).json({
        success: false,
        message: 'Email already exists',
      })
    }

    // --------------------------------------------------------
    // Update User
    // --------------------------------------------------------

    if (fullname !== undefined) {
      user.fullname = String(fullname).trim()
    }

    user.email = cleanEmail

    if (phone !== undefined) {
      user.phone = phone
        ? String(phone).trim()
        : null
    }

    if (role !== undefined) {
      user.role = role
    }

    // --------------------------------------------------------
    // Update password only when supplied
    // --------------------------------------------------------

    if (
      password &&
      String(password).trim() !== ''
    ) {

      if (String(password).length < 6) {

        await transaction.rollback()

        return res.status(400).json({
          success: false,
          message:
            'Password must be at least 6 characters long',
        })
      }

      user.password = await bcrypt.hash(
        password,
        10,
      )
    }

    await user.save({
      transaction,
    })

    // --------------------------------------------------------
    // Update Staff
    // --------------------------------------------------------

    if (position !== undefined) {
      staff.position = position
        ? String(position).trim()
        : null
    }

    if (salary !== undefined) {

      if (
        salary === null ||
        salary === ''
      ) {
        staff.salary = null
      } else {

        const numericSalary =
          Number(salary)

        if (
          Number.isNaN(numericSalary) ||
          numericSalary < 0
        ) {

          await transaction.rollback()

          return res.status(400).json({
            success: false,
            message:
              'Salary must be a valid amount',
          })
        }

        staff.salary = numericSalary
      }
    }

    if (employmentType !== undefined) {
      staff.employmentType =
        employmentType
          ? String(employmentType).trim()
          : 'salary'
    }

    await staff.save({
      transaction,
    })

    // --------------------------------------------------------
    // Commit
    // --------------------------------------------------------

    await transaction.commit()

    return res.status(200).json({
      success: true,
      message: 'Staff updated successfully',
    })

  } catch (error) {

    if (!transaction.finished) {
      await transaction.rollback()
    }

    console.error(
      'UPDATE STAFF ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// ============================================================
// UPDATE STAFF STATUS
// ============================================================

exports.updateStaffStatus = async (
  req,
  res,
) => {

  try {

    const { id } = req.params
    const { isActive } = req.body

    if (
      typeof isActive !== 'boolean'
    ) {
      return res.status(400).json({
        success: false,
        message:
          'isActive must be true or false',
      })
    }

    const staff = await Staff.findByPk(
      id,
      {
        include: [
          {
            model: User,
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

    if (!staff.User) {
      return res.status(404).json({
        success: false,
        message:
          'Staff user account not found',
      })
    }

    staff.User.isActive = isActive

    await staff.User.save()

    return res.status(200).json({
      success: true,

      message: isActive
        ? 'Staff activated successfully.'
        : 'Staff deactivated successfully.',

      staff,
    })

  } catch (error) {

    console.error(
      'UPDATE STAFF STATUS ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}


// ============================================================
// GET STAFF QR CODE
// ============================================================

exports.getStaffQRCode = async (
  req,
  res,
) => {

  try {

    const { id } = req.params

    const staff = await Staff.findByPk(id)

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found',
      })
    }

    if (!staff.qrCode) {
      return res.status(400).json({
        success: false,
        message:
          'Staff QR code has not been generated',
      })
    }

    const qrImage =
      await QRCode.toDataURL(
        staff.qrCode,
        {
          width: 500,
          margin: 2,
        },
      )

    return res.status(200).json({
      success: true,
      qrCode: staff.qrCode,
      qrImage,
    })

  } catch (error) {

    console.error(
      'GET STAFF QR ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}