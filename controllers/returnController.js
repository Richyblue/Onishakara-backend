const { Op } = require('sequelize')
const sequelize = require('../config/db')

const Sale = require('../models/Sale')
const SaleItem = require('../models/saleItem')
const Product = require('../models/Product')
const ProductVariant = require('../models/ProductVariant')
const Customer = require('../models/Customer')
const User = require('../models/User')

const SalesReturn = require('../models/SalesReturn')
const SalesReturnItem = require('../models/SalesReturnItem')
const StockMovement = require('../models/StockMovement')

// ============================================================
// GENERATE RETURN NUMBER
// ============================================================

const generateReturnNumber = () => {
  return `RET-${Date.now()}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`
}

// ============================================================
// CREATE STOCK MOVEMENT
// ============================================================

const createStockMovement = async ({
  productId,
  variantId = null,
  quantityBefore,
  quantityChange,
  quantityAfter,
  returnId,
  returnNumber,
  reason,
  recordedById,
  transaction,
}) => {
  return StockMovement.create(
    {
      productId,
      variantId,

      movementType: 'return',

      quantityBefore,
      quantityChange,
      quantityAfter,

      referenceType: 'sales_return',
      referenceId: returnId,
      referenceNumber: returnNumber,

      reason:
        reason ||
        'Customer return',

      notes:
        `Stock restored from sales return ${returnNumber}`,

      recordedById,
    },
    {
      transaction,
    },
  )
}

// ============================================================
// CREATE RETURN
// ============================================================

exports.createReturn = async (req, res) => {
  const transaction = await sequelize.transaction()

  try {
    const {
      saleId,
      items,
      refundType,
      reason,
      remarks,
    } = req.body

    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (!saleId) {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message: 'Sale ID is required',
      })
    }

    if (!Array.isArray(items) || items.length === 0) {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message:
          'At least one product is required for a return',
      })
    }

    const allowedRefundTypes = [
      'refund',
      'exchange',
      'credit_note',
    ]

    if (!allowedRefundTypes.includes(refundType)) {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message: 'Invalid refund type',
      })
    }

    // --------------------------------------------------------
    // FIND SALE
    // --------------------------------------------------------

    const sale = await Sale.findByPk(saleId, {
      include: [
        {
          model: Customer,
          as: 'Customer',
          required: false,
        },

        {
          model: SaleItem,
          as: 'SaleItems',
          required: true,
        },
      ],

      transaction,

      lock: transaction.LOCK.UPDATE,
    })

    if (!sale) {
      await transaction.rollback()

      return res.status(404).json({
        success: false,
        message: 'Sale not found',
      })
    }

    if (sale.status !== 'completed') {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message:
          'Only completed sales can be returned',
      })
    }

    const originalItems = sale.SaleItems || []

    // --------------------------------------------------------
    // VALIDATE EACH RETURN ITEM
    // --------------------------------------------------------

    const validatedItems = []

    for (const item of items) {
      const productId = Number(
        item.ProductId ||
          item.productId,
      )

      const variantId =
        item.ProductVariantId ||
        item.variantId
          ? Number(
              item.ProductVariantId ||
                item.variantId,
            )
          : null

      const quantity = Number(
        item.quantity || 0,
      )

      if (!productId) {
        await transaction.rollback()

        return res.status(400).json({
          success: false,
          message:
            'Product ID is required for every returned item',
        })
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        await transaction.rollback()

        return res.status(400).json({
          success: false,
          message:
            'Return quantity must be a positive whole number',
        })
      }

      // ------------------------------------------------------
      // FIND ORIGINAL SALE ITEM
      // ------------------------------------------------------

      const originalItem =
        originalItems.find(
          (saleItem) => {
            const sameProduct =
              Number(saleItem.ProductId) ===
              productId

            const originalVariant =
              saleItem.ProductVariantId
                ? Number(
                    saleItem.ProductVariantId,
                  )
                : null

            const sameVariant =
              originalVariant ===
              variantId

            return (
              sameProduct &&
              sameVariant
            )
          },
        )

      if (!originalItem) {
        await transaction.rollback()

        return res.status(400).json({
          success: false,
          message:
            'The selected product/variant was not found in the original sale',
        })
      }

      // ------------------------------------------------------
      // FIND PREVIOUS APPROVED/PENDING RETURNS
      // ------------------------------------------------------

      const previousReturns =
        await SalesReturnItem.findAll({
          where: {
            ProductId: productId,

            ...(variantId
              ? {
                  ProductVariantId:
                    variantId,
                }
              : {
                  ProductVariantId: null,
                }),
          },

          include: [
            {
              model: SalesReturn,
              as: 'SalesReturn',

              where: {
                SaleId: sale.id,

                status: {
                  [Op.in]: [
                    'approved',
                    'pending',
                  ],
                },
              },

              attributes: [],
            },
          ],

          transaction,
        })

      const previouslyReturned =
        previousReturns.reduce(
          (sum, returnItem) =>
            sum +
            Number(
              returnItem.quantity || 0,
            ),
          0,
        )

      const originalQuantity =
        Number(
          originalItem.quantity || 0,
        )

      if (
        previouslyReturned +
          quantity >
        originalQuantity
      ) {
        await transaction.rollback()

        return res.status(400).json({
          success: false,
          message:
            `Return quantity exceeds the available quantity for ${
              originalItem.productName ||
              'this product'
            }. Sold: ${originalQuantity}, Already returned: ${previouslyReturned}, Available: ${
              originalQuantity -
              previouslyReturned
            }.`,
        })
      }

      // ------------------------------------------------------
      // USE ORIGINAL SALE PRICE
      // ------------------------------------------------------

      const returnPrice =
        Number(
          originalItem.price || 0,
        )

      const subtotal =
        quantity * returnPrice

      validatedItems.push({
        productId,
        variantId,
        quantity,
        price: returnPrice,
        subtotal,
      })
    }

    // --------------------------------------------------------
    // CREATE RETURN NUMBER
    // --------------------------------------------------------

    let returnNumber =
      generateReturnNumber()

    // Extra uniqueness protection
    let existing =
      await SalesReturn.findOne({
        where: {
          returnNumber,
        },
        transaction,
      })

    while (existing) {
      returnNumber =
        generateReturnNumber()

      existing =
        await SalesReturn.findOne({
          where: {
            returnNumber,
          },
          transaction,
        })
    }

    // --------------------------------------------------------
    // CREATE SALES RETURN
    // --------------------------------------------------------

    const salesReturn =
      await SalesReturn.create(
        {
          returnNumber,

          SaleId: sale.id,

          CustomerId:
            sale.CustomerId ||
            null,

          ProcessedById:
            req.user?.id ||
            null,

          refundType,

          reason:
            reason ||
            null,

          remarks:
            remarks ||
            null,

          totalRefund: 0,

          status: 'approved',
        },
        {
          transaction,
        },
      )

    let totalRefund = 0

    // --------------------------------------------------------
    // PROCESS ITEMS
    // --------------------------------------------------------

    for (const item of validatedItems) {
      const {
        productId,
        variantId,
        quantity,
        price,
        subtotal,
      } = item

      totalRefund += subtotal

      // ------------------------------------------------------
      // LOAD PRODUCT
      // ------------------------------------------------------

      const product =
        await Product.findByPk(
          productId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          },
        )

      if (!product) {
        throw new Error(
          `Product ${productId} no longer exists`,
        )
      }

      // ------------------------------------------------------
      // LOAD VARIANT IF APPLICABLE
      // ------------------------------------------------------

      let variant = null

      if (variantId) {
        variant =
          await ProductVariant.findByPk(
            variantId,
            {
              transaction,
              lock: transaction.LOCK.UPDATE,
            },
          )

        if (!variant) {
          throw new Error(
            `Product variant ${variantId} no longer exists`,
          )
        }

        if (
          Number(variant.productId) !==
          productId
        ) {
          throw new Error(
            'Selected variant does not belong to the selected product',
          )
        }
      }

      // ------------------------------------------------------
      // CREATE RETURN ITEM
      // ------------------------------------------------------

      await SalesReturnItem.create(
        {
          SalesReturnId:
            salesReturn.id,

          ProductId:
            productId,

          ProductVariantId:
            variantId,

          itemType:
            'product',

          productName:
            product.name,

          variantName:
            variant
              ? [
                  variant.size,
                  variant.color,
                ]
                  .filter(Boolean)
                  .join(' / ')
              : null,

          quantity,

          price,

          subtotal,
        },
        {
          transaction,
        },
      )

      // ======================================================
      // RESTORE STOCK
      // ======================================================

      if (variant) {
        // ----------------------------------------------------
        // VARIANT STOCK
        // ----------------------------------------------------

        const variantBefore =
          Number(
            variant.quantity || 0,
          )

        const variantAfter =
          variantBefore + quantity

        variant.quantity =
          variantAfter

        await variant.save({
          transaction,
        })

        await createStockMovement({
          productId,
          variantId,

          quantityBefore:
            variantBefore,

          quantityChange:
            quantity,

          quantityAfter:
            variantAfter,

          returnId:
            salesReturn.id,

          returnNumber,

          reason:
            reason ||
            'Customer return',

          recordedById:
            req.user?.id ||
            null,

          transaction,
        })

        // ----------------------------------------------------
        // PARENT PRODUCT AGGREGATE STOCK
        // ----------------------------------------------------

        const productBefore =
          Number(
            product.quantity || 0,
          )

        const productAfter =
          productBefore + quantity

        product.quantity =
          productAfter

        await product.save({
          transaction,
        })

        await createStockMovement({
          productId,

          variantId: null,

          quantityBefore:
            productBefore,

          quantityChange:
            quantity,

          quantityAfter:
            productAfter,

          returnId:
            salesReturn.id,

          returnNumber,

          reason:
            'Variant return - parent stock aggregate',

          recordedById:
            req.user?.id ||
            null,

          transaction,
        })
      } else {
        // ----------------------------------------------------
        // NORMAL PRODUCT STOCK
        // ----------------------------------------------------

        const productBefore =
          Number(
            product.quantity || 0,
          )

        const productAfter =
          productBefore + quantity

        product.quantity =
          productAfter

        await product.save({
          transaction,
        })

        await createStockMovement({
          productId,

          variantId: null,

          quantityBefore:
            productBefore,

          quantityChange:
            quantity,

          quantityAfter:
            productAfter,

          returnId:
            salesReturn.id,

          returnNumber,

          reason:
            reason ||
            'Customer return',

          recordedById:
            req.user?.id ||
            null,

          transaction,
        })
      }
    }

    // --------------------------------------------------------
    // SAVE TOTAL
    // --------------------------------------------------------

    salesReturn.totalRefund =
      totalRefund

    await salesReturn.save({
      transaction,
    })

    // --------------------------------------------------------
    // COMMIT
    // --------------------------------------------------------

    await transaction.commit()

    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.status(201).json({
      success: true,

      message:
        'Return processed successfully',

      salesReturn: {
        id:
          salesReturn.id,

        returnNumber:
          salesReturn.returnNumber,

        SaleId:
          salesReturn.SaleId,

        CustomerId:
          salesReturn.CustomerId,

        refundType:
          salesReturn.refundType,

        reason:
          salesReturn.reason,

        remarks:
          salesReturn.remarks,

        totalRefund:
          salesReturn.totalRefund,

        status:
          salesReturn.status,
      },
    })
  } catch (error) {
    try {
      await transaction.rollback()
    } catch (rollbackError) {
      console.error(
        'RETURN ROLLBACK ERROR:',
        rollbackError,
      )
    }

    console.error(
      'CREATE RETURN ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to process return',
    })
  }
}

// ============================================================
// GET ALL RETURNS
// ============================================================

exports.getReturns = async (
  req,
  res,
) => {
  try {
    const {
      status,
      refundType,
      startDate,
      endDate,
    } = req.query

    const where = {}

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (status) {
      where.status = status
    }

    // --------------------------------------------------------
    // REFUND TYPE
    // --------------------------------------------------------

    if (refundType) {
      where.refundType =
        refundType
    }

    // --------------------------------------------------------
    // DATE
    // --------------------------------------------------------

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [
          new Date(
            `${startDate}T00:00:00`,
          ),

          new Date(
            `${endDate}T23:59:59`,
          ),
        ],
      }
    } else if (startDate) {
      where.createdAt = {
        [Op.gte]: new Date(
          `${startDate}T00:00:00`,
        ),
      }
    } else if (endDate) {
      where.createdAt = {
        [Op.lte]: new Date(
          `${endDate}T23:59:59`,
        ),
      }
    }

    // --------------------------------------------------------
    // FIND RETURNS
    // --------------------------------------------------------

    const returns =
      await SalesReturn.findAll({
        where,

        include: [
          {
            model: Sale,
            as: 'Sale',

            attributes: [
              'id',
              'receiptNumber',
              'totalAmount',
              'paymentMethod',
              'createdAt',
            ],

            required: false,
          },

          {
            model: Customer,
            as: 'Customer',

            attributes: [
              'id',
              'fullname',
              'phone',
            ],

            required: false,
          },

          {
            model: User,
            as: 'ProcessedBy',

            attributes: [
              'id',
              'fullname',
            ],

            required: false,
          },

          {
            model: SalesReturnItem,
            as: 'ReturnItems',

            required: false,

            include: [
              {
                model: Product,
                as: 'Product',

                required: false,
              },

              {
                model: ProductVariant,
                as: 'ProductVariant',

                required: false,
              },
            ],
          },
        ],

        order: [
          ['createdAt', 'DESC'],
        ],
      })

    return res.status(200).json({
      success: true,

      total:
        returns.length,

      returns,
    })
  } catch (error) {
    console.error(
      'GET RETURNS ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load returns',
    })
  }
}

// ============================================================
// GET SINGLE RETURN
// ============================================================

exports.getSingleReturn = async (
  req,
  res,
) => {
  try {
    const { id } = req.params

    const salesReturn =
      await SalesReturn.findByPk(id, {
        include: [
          {
            model: Sale,
            as: 'Sale',

            attributes: [
              'id',
              'receiptNumber',
              'totalAmount',
              'paymentMethod',
              'createdAt',
            ],
          },

          {
            model: Customer,
            as: 'Customer',

            attributes: [
              'id',
              'fullname',
              'phone',
            ],
          },

          {
            model: User,
            as: 'ProcessedBy',

            attributes: [
              'id',
              'fullname',
            ],
          },

          {
            model: SalesReturnItem,
            as: 'ReturnItems',

            include: [
              {
                model: Product,
                as: 'Product',
              },

              {
                model: ProductVariant,
                as: 'ProductVariant',
              },
            ],
          },
        ],
      })

    if (!salesReturn) {
      return res.status(404).json({
        success: false,
        message:
          'Return not found',
      })
    }

    return res.status(200).json({
      success: true,
      salesReturn,
    })
  } catch (error) {
    console.error(
      'GET SINGLE RETURN ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to load return',
    })
  }
}

// ============================================================
// DELETE RETURN
// ============================================================

exports.deleteReturn = async (
  req,
  res,
) => {
  const transaction =
    await sequelize.transaction()

  try {
    const { id } = req.params

    const salesReturn =
      await SalesReturn.findByPk(id, {
        include: [
          {
            model: SalesReturnItem,
            as: 'ReturnItems',
          },
        ],

        transaction,

        lock: transaction.LOCK.UPDATE,
      })

    if (!salesReturn) {
      await transaction.rollback()

      return res.status(404).json({
        success: false,
        message:
          'Return not found',
      })
    }

    // --------------------------------------------------------
    // APPROVED RETURNS MUST NOT BE DELETED
    // --------------------------------------------------------

    if (
      salesReturn.status ===
      'approved'
    ) {
      await transaction.rollback()

      return res.status(400).json({
        success: false,
        message:
          'Approved returns cannot be deleted because stock has already been restored.',
      })
    }

    // --------------------------------------------------------
    // DELETE ITEMS
    // --------------------------------------------------------

    await SalesReturnItem.destroy({
      where: {
        SalesReturnId:
          salesReturn.id,
      },

      transaction,
    })

    // --------------------------------------------------------
    // DELETE RETURN
    // --------------------------------------------------------

    await salesReturn.destroy({
      transaction,
    })

    await transaction.commit()

    return res.status(200).json({
      success: true,
      message:
        'Return deleted successfully',
    })
  } catch (error) {
    try {
      await transaction.rollback()
    } catch (rollbackError) {
      console.error(
        'RETURN DELETE ROLLBACK ERROR:',
        rollbackError,
      )
    }

    console.error(
      'DELETE RETURN ERROR:',
      error,
    )

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Unable to delete return',
    })
  }
}