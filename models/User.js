const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const User = sequelize.define(
  'User',
  {
    // ========================================================
    // PRIMARY KEY
    // ========================================================

    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    // ========================================================
    // PERSONAL INFORMATION
    // ========================================================

    fullname: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,

      validate: {
        isEmail: {
          msg: 'Please provide a valid email address',
        },
      },
    },

    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },

    // ========================================================
    // LOGIN
    // ========================================================

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    // ========================================================
    // ROLE
    // ========================================================

    role: {
      type: DataTypes.ENUM(
        'admin',
        'manager',
        'cashier',
        'staff'
      ),

      allowNull: false,
      defaultValue: 'staff',
    },

    // ========================================================
    // ACCOUNT STATUS
    // ========================================================

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },

  {
    tableName: 'Users',

    timestamps: true,

    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ['email'],
      },

      {
        fields: ['role'],
      },

      {
        fields: ['isActive'],
      },
    ],
  }
)


// ============================================================
// ASSOCIATIONS
// ============================================================

User.associate = (models) => {

  // ----------------------------------------------------------
  // One User = One Staff profile
  // ----------------------------------------------------------

  if (models.Staff) {
    User.hasOne(models.Staff, {
      foreignKey: 'UserId',
      as: 'Staff',
    })
  }

  // ----------------------------------------------------------
  // Sales recorded by this user
  // ----------------------------------------------------------

  if (models.Sale) {
    User.hasMany(models.Sale, {
      foreignKey: 'RecordedById',
      as: 'RecordedSales',
    })
  }

  // ----------------------------------------------------------
  // Returns processed by this user
  // ----------------------------------------------------------

  if (models.SalesReturn) {
    User.hasMany(models.SalesReturn, {
      foreignKey: 'ProcessedById',
      as: 'ProcessedReturns',
    })
  }
}


module.exports = User