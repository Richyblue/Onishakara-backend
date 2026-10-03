const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Staff = sequelize.define(
  'Staff',
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    // --------------------------------------------------------
    // USER ACCOUNT
    // --------------------------------------------------------

    UserId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      unique: true,

      references: {
        model: 'Users',
        key: 'id',
      },

      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },

    // --------------------------------------------------------
    // STAFF INFORMATION
    // --------------------------------------------------------

    position: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    salary: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
    },

    /*
      Keep this as STRING instead of ENUM.

      This prevents Sequelize/database enum conflicts if you
      later decide to add employment types such as:

      salary
      full_time
      part_time
      contract

      The controller currently defaults this to "salary".
    */
    employmentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'salary',
    },

    // --------------------------------------------------------
    // STAFF QR CODE
    // --------------------------------------------------------

    qrCode: {
      type: DataTypes.STRING(100),
      allowNull: true,
      unique: true,
    },
  },
  {
    tableName: 'Staffs',

    timestamps: true,

    paranoid: true,

    indexes: [
      {
        unique: true,
        fields: ['UserId'],
      },

      {
        unique: true,
        fields: ['qrCode'],
      },

      {
        fields: ['employmentType'],
      },
    ],
  },
)


// ============================================================
// ASSOCIATIONS
// ============================================================

Staff.associate = (models) => {

  // Staff belongs to one User account
  if (models.User) {
    Staff.belongsTo(models.User, {
      foreignKey: 'UserId',
      as: 'User',
    })
  }

}


// ============================================================
// EXPORT
// ============================================================

module.exports = Staff