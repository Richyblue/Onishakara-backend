const { DataTypes } = require('sequelize')
const sequelize = require('../config/db')

const Product = require('./Product')
const ProductVariant = require('./ProductVariant')

const SalesReturnItem = sequelize.define(
  'SalesReturnItem',
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },

    SalesReturnId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    ProductId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },

    ProductVariantId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },

    itemType: {
      type: DataTypes.ENUM('product'),
      allowNull: false,
      defaultValue: 'product',
    },

    productName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    variantName: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },

    price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },

    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: 'SalesReturnItems',
    timestamps: true,
  },
)

/*
|--------------------------------------------------------------------------
| Associations
|--------------------------------------------------------------------------
*/

SalesReturnItem.belongsTo(Product, {
  foreignKey: 'ProductId',
  as: 'Product',
})

Product.hasMany(SalesReturnItem, {
  foreignKey: 'ProductId',
  as: 'ReturnItems',
})

SalesReturnItem.belongsTo(ProductVariant, {
  foreignKey: 'ProductVariantId',
  as: 'ProductVariant',
})

ProductVariant.hasMany(SalesReturnItem, {
  foreignKey: 'ProductVariantId',
  as: 'ReturnItems',
})

module.exports = SalesReturnItem