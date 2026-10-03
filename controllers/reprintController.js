const { Op } = require('sequelize')

const Sale = require('../models/Sale')
const SaleItem = require('../models/saleItem')
const Customer = require('../models/Customer')
const Product = require('../models/Product')
const Service = require('../models/Service')
const User = require('../models/User')
const Staff = require('../models/Staff')

exports.searchSales = async (req, res) => {
  try {
    const { search } = req.query

    if (!search) {
      return res.status(200).json({
        success: true,
        sales: [],
      })
    }

    const sales = await Sale.findAll({
      include: [
        {
          model: Customer,
          required: false,
          where: {
            [Op.or]: [
              {
                fullname: {
                  [Op.like]: `%${search}%`,
                },
              },
              {
                phone: {
                  [Op.like]: `%${search}%`,
                },
              },
            ],
          },
        },

        {
          model: Staff,
          as: 'ServiceProvider',
          required: false,
          include: [
            {
              model: User,
              attributes: [
                'id',
                'fullname',
              ],
            },
          ],
        },
      ],

      where: {
        [Op.or]: [
          {
            receiptNumber: {
              [Op.like]: `%${search}%`,
            },
          },
        ],
      },

      order: [
        ['createdAt', 'DESC'],
      ],

      limit: 30,
    })

    return res.status(200).json({
      success: true,
      sales,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

exports.reprintReceipt = async (req, res) => {
  try {
    const sale = await Sale.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
          attributes: ['id', 'fullname', 'phone'],
          required: false,
        },

        {
          model: User,
          as: 'RecordedBy',
          attributes: ['id', 'fullname'],
          required: false,
        },

        {
          model: SaleItem,
          as: 'SaleItems',
          include: [
            {
              model: Product,
              attributes: ['id', 'name'],
              required: false,
            },

            {
              model: Service,
              attributes: ['id', 'name'],
              required: false,
            },
          ],
        },
      ],
    })

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      })
    }

    return res.status(200).json({
      success: true,
      sale,
    })
  } catch (error) {
    console.error('REPRINT RECEIPT ERROR:', error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}