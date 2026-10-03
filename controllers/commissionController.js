const Commission = require('../models/Commission')
const Staff = require('../models/Staff')
const User = require('../models/User')
const Sale = require('../models/Sale')
const SaleItem = require('../models/saleItem')
const SalesReturn = require('../models/SalesReturn')
const SalesReturnItem = require('../models/SalesReturnItem')

/**
 * ============================================================
 * COMMISSION CALCULATION HELPER
 * ============================================================
 *
 * This is the SINGLE source of truth for commission calculation.
 *
 * Every commission represents ONE staff commission for ONE
 * service SaleItem.
 *
 * Calculation:
 *
 * Original Commission
 *        ↓
 * Less returned commission
 *        ↓
 * Current Commission
 *        ↓
 * Less paid amount
 *        ↓
 * Outstanding Commission
 *
 * IMPORTANT:
 *
 * commissionAmount is historical.
 *
 * We NEVER recalculate the commission using the current
 * Service commission settings.
 *
 * ============================================================
 */

const calculateCommission = (
  commission,
  sale
) => {

  const data =
    commission?.toJSON
      ? commission.toJSON()
      : commission

  const saleData =
    sale?.toJSON
      ? sale.toJSON()
      : sale

  // ============================================================
  // BASIC DATA
  // ============================================================

  const commissionRate =
    Number(
      data?.commissionRate || 0
    )

  const serviceId =
    Number(
      data?.ServiceId || 0
    )

  const saleItemId =
    Number(
      data?.SaleItemId || 0
    )

  const storedCommissionAmount =
    Number(
      data?.commissionAmount || 0
    )

  const paidAmount =
    Number(
      data?.paidAmount || 0
    )

  // ============================================================
  // SALE ITEMS
  // ============================================================

  const saleItems =
    saleData?.SaleItems || []

  // ============================================================
  // FIND EXACT SALE ITEM
  // ============================================================

  let commissionSaleItem = null

  // ------------------------------------------------------------
  // FIRST: SaleItemId
  // ------------------------------------------------------------

  if (saleItemId > 0) {

    commissionSaleItem =
      saleItems.find(
        (item) =>
          Number(item.id || 0) ===
          saleItemId
      ) || null

  }

  // ------------------------------------------------------------
  // SECOND: ServiceId
  // ------------------------------------------------------------
  //
  // Used only for old/legacy commission records.
  //
  // ------------------------------------------------------------

  if (
    !commissionSaleItem &&
    serviceId > 0
  ) {

    commissionSaleItem =
      saleItems.find(
        (item) => {

          const itemType =
            String(
              item.itemType || ''
            ).toLowerCase()

          if (
            itemType !== 'service'
          ) {
            return false
          }

          const itemServiceId =
            Number(
              item.ServiceId ??
              item.serviceId ??
              0
            )

          return (
            itemServiceId ===
            serviceId
          )
        }
      ) || null

  }

  // ============================================================
  // ORIGINAL SERVICE TOTAL
  // ============================================================

  let originalServiceTotal = 0

  if (
    commissionSaleItem
  ) {

    originalServiceTotal =
      Number(
        commissionSaleItem.subtotal ||
        0
      )

  } else if (
    serviceId > 0
  ) {

    /*
     * Legacy fallback.
     *
     * If there is no exact SaleItemId, use the matching
     * service items.
     */

    originalServiceTotal =
      saleItems
        .filter(
          (item) => {

            const itemType =
              String(
                item.itemType || ''
              ).toLowerCase()

            if (
              itemType !== 'service'
            ) {
              return false
            }

            const itemServiceId =
              Number(
                item.ServiceId ??
                item.serviceId ??
                0
              )

            return (
              itemServiceId ===
              serviceId
            )
          }
        )
        .reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.subtotal || 0
            ),
          0
        )

  }

  // ============================================================
  // ORIGINAL COMMISSION
  // ============================================================
  //
  // Stored commission amount ALWAYS wins.
  //
  // Historical legacy records with a zero amount may use
  // the historical commissionRate as a fallback.
  //
  // ============================================================

  let originalCommission =
    storedCommissionAmount

  if (
    originalCommission <= 0 &&
    originalServiceTotal > 0 &&
    commissionRate > 0
  ) {

    originalCommission =
      (
        originalServiceTotal *
        commissionRate
      ) / 100

  }

  originalCommission =
    Math.max(
      originalCommission,
      0
    )

  // ============================================================
  // APPROVED RETURNS
  // ============================================================

  const salesReturns =
    saleData?.SalesReturns || []

  let returnedServiceTotal = 0

  for (
    const returnRecord of salesReturns
  ) {

    const returnItems =
      returnRecord.ReturnItems || []

    for (
      const returnItem of returnItems
    ) {

      const itemType =
        String(
          returnItem.itemType || ''
        ).toLowerCase()

      if (
        itemType !== 'service'
      ) {
        continue
      }

      // ========================================================
      // RETURN SALE ITEM ID
      // ========================================================

      const returnSaleItemId =
        Number(
          returnItem.SaleItemId ??
          returnItem.saleItemId ??
          0
        )

      // ========================================================
      // RETURN SERVICE ID
      // ========================================================

      const returnServiceId =
        Number(
          returnItem.ServiceId ??
          returnItem.serviceId ??
          0
        )

      // ========================================================
      // EXACT SALE ITEM MATCH
      // ========================================================

      if (
        saleItemId > 0 &&
        returnSaleItemId > 0
      ) {

        if (
          returnSaleItemId ===
          saleItemId
        ) {

          /*
           * Use subtotal when it exists.
           *
           * This is preferable because it represents the
           * actual returned value.
           */

          let returnedValue =
            Number(
              returnItem.subtotal || 0
            )

          /*
           * Legacy return records may have quantity but
           * no subtotal.
           */

          if (
            returnedValue <= 0 &&
            commissionSaleItem
          ) {

            const quantity =
              Number(
                commissionSaleItem.quantity ||
                0
              )

            const subtotal =
              Number(
                commissionSaleItem.subtotal ||
                0
              )

            const unitPrice =
              quantity > 0
                ? subtotal / quantity
                : 0

            returnedValue =
              Number(
                returnItem.quantity || 0
              ) *
              unitPrice

          }

          returnedServiceTotal +=
            returnedValue
        }

        continue
      }

      // ========================================================
      // LEGACY SERVICE MATCH
      // ========================================================

      if (
        serviceId > 0 &&
        returnServiceId ===
        serviceId
      ) {

        let returnedValue =
          Number(
            returnItem.subtotal || 0
          )

        /*
         * Legacy fallback if subtotal is not available.
         */

        if (
          returnedValue <= 0
        ) {

          const matchingItems =
            saleItems.filter(
              (item) => {

                const itemType =
                  String(
                    item.itemType || ''
                  ).toLowerCase()

                if (
                  itemType !== 'service'
                ) {
                  return false
                }

                const itemServiceId =
                  Number(
                    item.ServiceId ??
                    item.serviceId ??
                    0
                  )

                return (
                  itemServiceId ===
                  serviceId
                )
              }
            )

          const totalQuantity =
            matchingItems.reduce(
              (
                sum,
                item
              ) =>
                sum +
                Number(
                  item.quantity || 0
                ),
              0
            )

          const totalSubtotal =
            matchingItems.reduce(
              (
                sum,
                item
              ) =>
                sum +
                Number(
                  item.subtotal || 0
                ),
              0
            )

          const unitPrice =
            totalQuantity > 0
              ? totalSubtotal /
                totalQuantity
              : 0

          returnedValue =
            Number(
              returnItem.quantity || 0
            ) *
            unitPrice

        }

        returnedServiceTotal +=
          returnedValue

      }

    }

  }

  // ============================================================
  // SAFETY CAP
  // ============================================================

  returnedServiceTotal =
    Math.min(
      Math.max(
        returnedServiceTotal,
        0
      ),
      originalServiceTotal
    )

  // ============================================================
  // REMAINING SERVICE TOTAL
  // ============================================================

  const remainingServiceTotal =
    Math.max(
      originalServiceTotal -
      returnedServiceTotal,
      0
    )

  // ============================================================
  // RETURNED COMMISSION
  // ============================================================
  //
  // Commission is reduced proportionally according to the
  // percentage of service value returned.
  //
  // ============================================================

  let returnedCommission = 0

  if (
    originalServiceTotal > 0 &&
    originalCommission > 0 &&
    returnedServiceTotal > 0
  ) {

    returnedCommission =
      (
        returnedServiceTotal /
        originalServiceTotal
      ) *
      originalCommission

  }

  returnedCommission =
    Math.min(
      Math.max(
        returnedCommission,
        0
      ),
      originalCommission
    )

  // ============================================================
  // CURRENT COMMISSION
  // ============================================================

  const currentCommission =
    Math.max(
      originalCommission -
      returnedCommission,
      0
    )

  // ============================================================
  // NORMALIZE PAID AMOUNT
  // ============================================================
  //
  // Never allow paid amount to mathematically exceed the
  // current commission when calculating outstanding.
  //
  // We do NOT modify the database value here.
  //
  // ============================================================

  const effectivePaidAmount =
    Math.min(
      Math.max(
        paidAmount,
        0
      ),
      currentCommission
    )

  // ============================================================
  // OUTSTANDING COMMISSION
  // ============================================================

  const outstandingCommission =
    Math.max(
      currentCommission -
      effectivePaidAmount,
      0
    )

  // ============================================================
  // SERVICE TYPE
  // ============================================================

  const serviceType =
    commissionSaleItem?.serviceType ??
    commissionSaleItem?.ServiceType ??
    null

  // ============================================================
  // RETURN RESULT
  // ============================================================

  return {

    commissionRate,

    serviceId,

    saleItemId,

    serviceType,

    originalServiceTotal,

    remainingServiceTotal,

    returnedServiceTotal,

    originalCommissionAmount:
      originalCommission,

    returnedCommissionAmount:
      returnedCommission,

    currentCommissionAmount:
      currentCommission,

    paidAmount:
      effectivePaidAmount,

    outstandingCommission,

    returned:
      returnedServiceTotal > 0,

    saleItem:
      commissionSaleItem,

  }

}

/**
 * ============================================================
 * GET COMMISSIONS
 * ============================================================
 *
 * IMPORTANT:
 *
 * The frontend should use:
 *
 * currentCommissionAmount
 * ------------------------
 * Total commission currently earned after returns.
 *
 * outstandingCommission
 * ---------------------
 * Amount still owed to the staff after payments.
 *
 * paidAmount
 * ----------
 * Amount already paid.
 *
 * ============================================================
 */

exports.getCommissions = async (
  req,
  res
) => {

  try {

    // ========================================================
    // FILTER
    // ========================================================

    const where = {}

    if (
      req.query.status
    ) {

      where.status =
        req.query.status

    }

    // ========================================================
    // GET COMMISSIONS
    // ========================================================

    const commissions =
      await Commission.findAll({

        where,

        include: [

          // ==================================================
          // STAFF
          // ==================================================

          {
            model: Staff,

            as: 'Staff',

            required: false,

            include: [

              {
                model: User,

                as: 'User',

                required: false,

                attributes: [
                  'id',
                  'fullname',
                ],
              },

            ],
          },

          // ==================================================
          // SALE
          // ==================================================

          {
            model: Sale,

            as: 'Sale',

            required: false,

            include: [

              // ==============================================
              // SALE ITEMS
              // ==============================================

              {
                model: SaleItem,

                as: 'SaleItems',

                required: false,
              },

              // ==============================================
              // APPROVED RETURNS
              // ==============================================

              {
                model: SalesReturn,

                required: false,

                where: {
                  status: 'approved',
                },

                include: [

                  {
                    model: SalesReturnItem,

                    as: 'ReturnItems',

                    required: false,
                  },

                ],
              },

            ],
          },

          // ==================================================
          // EXACT SALE ITEM
          // ==================================================

          {
            model: SaleItem,

            as: 'SaleItem',

            required: false,
          },

        ],

        order: [
          ['createdAt', 'DESC'],
        ],

      })

    // ========================================================
    // FORMAT COMMISSIONS
    // ========================================================

    const formattedCommissions =
      commissions.map(
        (commission) => {

          const data =
            commission.toJSON()

          const calculated =
            calculateCommission(
              commission,
              data.Sale
            )

          return {

            ...data,

            // ==================================================
            // IDENTIFIERS
            // ==================================================

            ServiceId:
              calculated.serviceId ||
              null,

            SaleItemId:
              calculated.saleItemId ||
              null,

            // ==================================================
            // SERVICE
            // ==================================================

            serviceType:
              calculated.serviceType,

            serviceItemCount:
              calculated.saleItem
                ? 1
                : 0,

            // ==================================================
            // SERVICE VALUE
            // ==================================================

            originalServiceTotal:
              Number(
                calculated
                  .originalServiceTotal
                  .toFixed(2)
              ),

            remainingServiceTotal:
              Number(
                calculated
                  .remainingServiceTotal
                  .toFixed(2)
              ),

            returnedServiceTotal:
              Number(
                calculated
                  .returnedServiceTotal
                  .toFixed(2)
              ),

            // ==================================================
            // COMMISSION
            // ==================================================

            originalCommissionAmount:
              Number(
                calculated
                  .originalCommissionAmount
                  .toFixed(2)
              ),

            returnedCommissionAmount:
              Number(
                calculated
                  .returnedCommissionAmount
                  .toFixed(2)
              ),

            currentCommissionAmount:
              Number(
                calculated
                  .currentCommissionAmount
                  .toFixed(2)
              ),

            /*
             * Keep commissionAmount for frontend compatibility.
             *
             * IMPORTANT:
             *
             * commissionAmount here represents the CURRENT
             * commission after approved returns.
             *
             * The original stored database amount remains
             * available as originalCommissionAmount.
             */

            commissionAmount:
              Number(
                calculated
                  .currentCommissionAmount
                  .toFixed(2)
              ),

            // ==================================================
            // PAYMENT
            // ==================================================

            paidAmount:
              Number(
                calculated
                  .paidAmount
                  .toFixed(2)
              ),

            outstandingCommission:
              Number(
                calculated
                  .outstandingCommission
                  .toFixed(2)
              ),

            // ==================================================
            // RETURN STATUS
            // ==================================================

            returned:
              calculated.returned,

          }

        }
      )

    // ========================================================
    // SUMMARY
    // ========================================================
    //
    // This summary uses outstandingCommission rather than
    // status so the KPI remains mathematically correct.
    //
    // ========================================================

    const totalCommission =
      formattedCommissions.reduce(
        (
          sum,
          commission
        ) =>
          sum +
          Number(
            commission.currentCommissionAmount ||
            0
          ),
        0
      )

    const totalPaid =
      formattedCommissions.reduce(
        (
          sum,
          commission
        ) =>
          sum +
          Number(
            commission.paidAmount ||
            0
          ),
        0
      )

    const totalOutstanding =
      formattedCommissions.reduce(
        (
          sum,
          commission
        ) =>
          sum +
          Number(
            commission.outstandingCommission ||
            0
          ),
        0
      )

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      commissions:
        formattedCommissions,

      summary: {

        totalCommission:
          Number(
            totalCommission.toFixed(2)
          ),

        totalPaid:
          Number(
            totalPaid.toFixed(2)
          ),

        totalOutstanding:
          Number(
            totalOutstanding.toFixed(2)
          ),

      },

    })

  } catch (error) {

    console.error(
      'GET COMMISSIONS ERROR:',
      error
    )

    return res.status(500).json({

      success: false,

      message:
        error.message,

    })

  }

}

/**
 * ============================================================
 * MARK COMMISSION AS PAID
 * ============================================================
 *
 * IMPORTANT:
 *
 * This endpoint calculates the CURRENT outstanding commission
 * before allowing payment.
 *
 * It prevents:
 *
 * - Overpayment
 * - Double payment
 * - Paying a returned commission amount
 *
 * ============================================================
 */

exports.markAsPaid = async (
  req,
  res
) => {

  try {

    // ========================================================
    // FIND COMMISSION
    // ========================================================

    const commission =
      await Commission.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Sale,

              as: 'Sale',

              required: false,

              include: [

                {
                  model: SaleItem,

                  as: 'SaleItems',

                  required: false,
                },

                {
                  model: SalesReturn,

                  required: false,

                  where: {
                    status: 'approved',
                  },

                  include: [

                    {
                      model: SalesReturnItem,

                      as: 'ReturnItems',

                      required: false,
                    },

                  ],
                },

              ],
            },
          ],
        }
      )

    if (!commission) {

      return res.status(404).json({

        success: false,

        message:
          'Commission not found',

      })

    }

    // ========================================================
    // CALCULATE CURRENT COMMISSION
    // ========================================================

    const calculated =
      calculateCommission(
        commission,
        commission.Sale
      )

    // ========================================================
    // CURRENT OUTSTANDING
    // ========================================================

    const outstanding =
      Number(
        calculated.outstandingCommission ||
        0
      )

    // ========================================================
    // ALREADY FULLY PAID
    // ========================================================

    if (
      outstanding <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'There is no outstanding commission to pay.',

        outstandingCommission:
          0,

      })

    }

    // ========================================================
    // REQUESTED PAYMENT
    // ========================================================

    let requestedAmount

    if (
      req.body &&
      req.body.amount !== undefined
    ) {

      requestedAmount =
        Number(
          req.body.amount
        )

    } else {

      requestedAmount =
        outstanding

    }

    // ========================================================
    // VALIDATE PAYMENT
    // ========================================================

    if (
      !Number.isFinite(
        requestedAmount
      ) ||
      requestedAmount <= 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Invalid commission payment amount.',

      })

    }

    // ========================================================
    // PREVENT OVERPAYMENT
    // ========================================================

    if (
      requestedAmount >
      outstanding
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Payment amount cannot exceed the outstanding commission of ₦${outstanding.toLocaleString()}.`,

        outstandingCommission:
          outstanding,

      })

    }

    // ========================================================
    // EXISTING PAID AMOUNT
    // ========================================================

    const existingPaidAmount =
      Number(
        commission.paidAmount || 0
      )

    const newPaidAmount =
      existingPaidAmount +
      requestedAmount

    // ========================================================
    // DETERMINE STATUS
    // ========================================================

    const remainingAfterPayment =
      Math.max(
        outstanding -
        requestedAmount,
        0
      )

    const newStatus =
      remainingAfterPayment <= 0
        ? 'paid'
        : 'pending'

    // ========================================================
    // UPDATE COMMISSION
    // ========================================================

    await commission.update({

      status:
        newStatus,

      paidAmount:
        newPaidAmount,

      paidAt:
        newStatus === 'paid'
          ? new Date()
          : commission.paidAt,

    })

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      message:
        newStatus === 'paid'
          ? 'Commission paid successfully'
          : 'Commission payment recorded successfully',

      commission: {

        id:
          commission.id,

        status:
          newStatus,

        originalCommissionAmount:
          Number(
            calculated.originalCommissionAmount
          ),

        currentCommissionAmount:
          Number(
            calculated.currentCommissionAmount
          ),

        paidAmount:
          Number(
            newPaidAmount
          ),

        outstandingCommission:
          Number(
            remainingAfterPayment
          ),

        paidAt:
          newStatus === 'paid'
            ? commission.paidAt
            : null,

      },

    })

  } catch (error) {

    console.error(
      'MARK COMMISSION PAID ERROR:',
      error
    )

    return res.status(500).json({

      success: false,

      message:
        error.message,

    })

  }

}

/**
 * ============================================================
 * BULK PAY COMMISSIONS
 * ============================================================
 *
 * Pays multiple pending commissions at once.
 *
 * IMPORTANT:
 *
 * This uses the SAME calculateCommission() helper used by
 * markAsPaid().
 *
 * Therefore:
 *
 * Original Commission
 *        ↓
 * Less approved returns
 *        ↓
 * Current Commission
 *        ↓
 * Less existing paid amount
 *        ↓
 * Outstanding Commission
 *        ↓
 * Pay outstanding amount
 *
 * The original commission calculation logic is NOT changed.
 *
 * Expected request:
 *
 * PUT /api/v1/commissions/pay-bulk
 *
 * Body:
 *
 * {
 *   "commissionIds": [1, 2, 3, 4]
 * }
 *
 * ============================================================
 */

exports.bulkMarkAsPaid = async (
  req,
  res
) => {

  try {

    // ========================================================
    // GET COMMISSION IDS
    // ========================================================

    const {
      commissionIds
    } = req.body || {}

    // ========================================================
    // VALIDATE IDS
    // ========================================================

    if (
      !Array.isArray(
        commissionIds
      ) ||
      commissionIds.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'Please provide at least one commission ID.',

      })

    }

    // ========================================================
    // CLEAN IDS
    // ========================================================

    const ids = [
      ...new Set(

        commissionIds
          .map(
            (id) =>
              Number(id)
          )
          .filter(
            (id) =>
              Number.isInteger(id) &&
              id > 0
          )

      ),
    ]

    if (
      ids.length === 0
    ) {

      return res.status(400).json({

        success: false,

        message:
          'No valid commission IDs were provided.',

      })

    }

    // ========================================================
    // GET COMMISSIONS
    // ========================================================
    //
    // We deliberately load the Sale, SaleItems and approved
    // returns because calculateCommission() needs them.
    //
    // ========================================================

    const commissions =
      await Commission.findAll({

        where: {

          id: ids,

        },

        include: [

          // ==================================================
          // SALE
          // ==================================================

          {
            model: Sale,

            as: 'Sale',

            required: false,

            include: [

              // ==============================================
              // SALE ITEMS
              // ==============================================

              {
                model: SaleItem,

                as: 'SaleItems',

                required: false,
              },

              // ==============================================
              // APPROVED RETURNS
              // ==============================================

              {
                model: SalesReturn,

                required: false,

                where: {

                  status:
                    'approved',

                },

                include: [

                  {
                    model: SalesReturnItem,

                    as: 'ReturnItems',

                    required: false,

                  },

                ],

              },

            ],

          },

        ],

      })

    // ========================================================
    // CHECK FOUND COMMISSIONS
    // ========================================================

    if (
      commissions.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          'No matching commissions were found.',

      })

    }

    // ========================================================
    // TRACK PAYMENT
    // ========================================================

    let totalPaid =
      0

    let paidCount =
      0

    let skippedCount =
      0

    const paidCommissions =
      []

    const skippedCommissions =
      []

    // ========================================================
    // PROCESS EACH COMMISSION
    // ========================================================

    for (
      const commission of commissions
    ) {

      // ======================================================
      // CALCULATE USING ORIGINAL LOGIC
      // ======================================================

      const calculated =
        calculateCommission(
          commission,
          commission.Sale
        )

      // ======================================================
      // CURRENT OUTSTANDING
      // ======================================================

      const outstanding =
        Number(
          calculated.outstandingCommission ||
          0
        )

      // ======================================================
      // NOTHING TO PAY
      // ======================================================

      if (
        outstanding <= 0
      ) {

        skippedCount++

        skippedCommissions.push({

          id:
            commission.id,

          reason:
            'No outstanding commission to pay.',

        })

        continue

      }

      // ======================================================
      // EXISTING PAID AMOUNT
      // ======================================================

      const existingPaidAmount =
        Number(
          commission.paidAmount || 0
        )

      // ======================================================
      // NEW PAID AMOUNT
      // ======================================================

      const newPaidAmount =
        existingPaidAmount +
        outstanding

      // ======================================================
      // UPDATE COMMISSION
      // ======================================================

      await commission.update({

        status:
          'paid',

        paidAmount:
          newPaidAmount,

        paidAt:
          new Date(),

      })

      // ======================================================
      // TOTAL
      // ======================================================

      totalPaid +=
        outstanding

      paidCount++

      // ======================================================
      // RESPONSE RECORD
      // ======================================================

      paidCommissions.push({

        id:
          commission.id,

        paidAmount:
          Number(
            outstanding.toFixed(2)
          ),

        totalPaidAmount:
          Number(
            newPaidAmount.toFixed(2)
          ),

        originalCommissionAmount:
          Number(
            calculated
              .originalCommissionAmount
              .toFixed(2)
          ),

        currentCommissionAmount:
          Number(
            calculated
              .currentCommissionAmount
              .toFixed(2)
          ),

        returnedCommissionAmount:
          Number(
            calculated
              .returnedCommissionAmount
              .toFixed(2)
          ),

        outstandingCommission:
          0,

        status:
          'paid',

        paidAt:
          commission.paidAt,

      })

    }

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(200).json({

      success: true,

      message:
        paidCount > 0
          ? `${paidCount} commission${paidCount === 1 ? '' : 's'} paid successfully.`
          : 'No commissions were paid.',

      updatedCount:
        paidCount,

      skippedCount:
        skippedCount,

      totalPaid:
        Number(
          totalPaid.toFixed(2)
        ),

      paidCommissions:
        paidCommissions,

      skippedCommissions:
        skippedCommissions,

    })

  } catch (error) {

    console.error(
      'BULK COMMISSION PAYMENT ERROR:',
      error
    )

    return res.status(500).json({

      success: false,

      message:
        error.message,

    })

  }

}