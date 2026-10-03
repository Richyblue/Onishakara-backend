const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Sale = require('./Sale')
const Customer = require('./Customer')
const User = require('./User')
const SalesReturnItem = require('./SalesReturnItem')

const SalesReturn = sequelize.define(
  'SalesReturn',
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    returnNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },

    SaleId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    CustomerId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    ProcessedById: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    refundType: {
      type: DataTypes.ENUM(
        'refund',
        'exchange',
        'credit_note',
      ),
      allowNull: false,
      defaultValue: 'refund',
    },

    reason: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    totalRefund: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    status: {
      type: DataTypes.ENUM(
        'pending',
        'approved',
        'rejected',
      ),
      allowNull: false,
      defaultValue: 'approved',
    },
  },
  {
    tableName: 'SalesReturns',
    timestamps: true,
  },
)

/*
|--------------------------------------------------------------------------
| Associations
|--------------------------------------------------------------------------
*/

SalesReturn.belongsTo(Sale, {
  foreignKey: 'SaleId',
  as: 'Sale',
})

Sale.hasMany(SalesReturn, {
  foreignKey: 'SaleId',
  as: 'Returns',
})

SalesReturn.belongsTo(Customer, {
  foreignKey: 'CustomerId',
  as: 'Customer',
})

Customer.hasMany(SalesReturn, {
  foreignKey: 'CustomerId',
  as: 'Returns',
})

SalesReturn.belongsTo(User, {
  foreignKey: 'ProcessedById',
  as: 'ProcessedBy',
})

User.hasMany(SalesReturn, {
  foreignKey: 'ProcessedById',
  as: 'ProcessedReturns',
})

SalesReturn.hasMany(SalesReturnItem, {
  foreignKey: 'SalesReturnId',
  as: 'ReturnItems',
})

SalesReturnItem.belongsTo(SalesReturn, {
  foreignKey: 'SalesReturnId',
  as: 'SalesReturn',
})

module.exports = SalesReturn