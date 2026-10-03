const { Op, fn, col, literal } = require('sequelize')

const sequelize = require('../config/db')

const {
  Sale,
  SaleItem,
  Product,
  ProductVariant,
  Customer,
  User,
  Staff,
  SalesReturn,
  SalesReturnItem,
  Expense,
} = require('../models')

/**
 * ============================================================
 * ONISHAKARA GOLD FASHION STORE
 * DASHBOARD SERVICE
 *
 * Fashion retail only.
 *
 * No:
 * - salon services
 * - service providers
 * - service commission
 * - home service
 * ============================================================
 */

const startOfDay = (date = new Date()) => {
  const value = new Date(date)

  value.setHours(0, 0, 0, 0)

  return value
}

const endOfDay = (date = new Date()) => {
  const value = new Date(date)

  value.setHours(23, 59, 59, 999)

  return value
}

const startOfMonth = (date = new Date()) => {
  const value = new Date(date)

  value.setDate(1)
  value.setHours(0, 0, 0, 0)

  return value
}

const startOfSevenDays = () => {
  const value = startOfDay(new Date())

  value.setDate(value.getDate() - 6)

  return value
}

const toNumber = (value) => {
  const number = Number(value)

  return Number.isFinite(number) ? number : 0
}

const round = (value, decimals = 2) => {
  const factor = Math.pow(10, decimals)

  return Math.round(toNumber(value) * factor) / factor
}

const getSaleDate = (sale) => {
  return sale?.createdAt || sale?.saleDate || sale?.date
}

const getSaleAmount = (sale) => {
  return toNumber(
    sale?.totalAmount ??
      sale?.total ??
      sale?.amount ??
      0,
  )
}

const getItemQuantity = (item) => {
  return toNumber(item?.quantity)
}

const getItemPrice = (item) => {
  return toNumber(
    item?.price ??
      item?.sellingPrice ??
      0,
  )
}

const getItemCost = (item) => {
  return toNumber(
    item?.costPrice ??
      item?.ProductVariant?.costPrice ??
      item?.Product?.costPrice ??
      0,
  )
}

const getItemRevenue = (item) => {
  return getItemQuantity(item) * getItemPrice(item)
}

const getItemCostValue = (item) => {
  return getItemQuantity(item) * getItemCost(item)
}

/**
 * Only completed + approved sales count as actual sales.
 */
const saleWhere = {
  status: 'completed',
  approvalStatus: 'approved',
}

/**
 * ============================================================
 * MAIN DASHBOARD
 * ============================================================
 */

const dashboardService = async () => {
  const now = new Date()

  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)

  const monthStart = startOfMonth(now)
  const monthEnd = endOfDay(now)

  const sevenDaysStart = startOfSevenDays()

  /**
   * ==========================================================
   * LOAD SALES
   * ==========================================================
   */

  const sales = await Sale.findAll({
    where: {
      ...saleWhere,

      createdAt: {
        [Op.gte]: sevenDaysStart,
        [Op.lte]: todayEnd,
      },
    },

    include: [
      {
        model: SaleItem,
        as: 'SaleItems',
        required: false,

        include: [
          {
            model: Product,
            as: 'Product',
            required: false,
            attributes: [
              'id',
              'name',
              'sku',
              'costPrice',
              'sellingPrice',
            ],
          },

          {
            model: ProductVariant,
            as: 'ProductVariant',
            required: false,
            attributes: [
              'id',
              'productId',
              'size',
              'color',
              'sku',
              'costPrice',
              'sellingPrice',
            ],
          },
        ],
      },

      {
        model: Customer,
        as: 'Customer',
        required: false,
      },

      {
        model: User,
        as: 'RecordedBy',
        required: false,
        attributes: [
          'id',
          'fullname',
          'email',
          'role',
        ],
      },
    ],

    order: [['createdAt', 'DESC']],
  })

  /**
   * ==========================================================
   * TODAY / MONTH SALES
   * ==========================================================
   */

  let todaySales = 0
  let monthSales = 0

  let todayTransactions = 0
  let todayCustomers = 0

  let todayCost = 0
  let monthCost = 0

  const todayCustomerIds = new Set()

  const monthSalesList = []

  sales.forEach((sale) => {
    const saleDate = getSaleDate(sale)

    if (!saleDate) return

    const date = new Date(saleDate)

    const amount = getSaleAmount(sale)

    const items = sale.SaleItems || []

    const cost = items.reduce(
      (sum, item) => sum + getItemCostValue(item),
      0,
    )

    /**
     * TODAY
     */
    if (date >= todayStart && date <= todayEnd) {
      todaySales += amount
      todayTransactions += 1
      todayCost += cost

      const customerId = sale.CustomerId

      if (customerId) {
        todayCustomerIds.add(String(customerId))
      }
    }

    /**
     * MONTH
     */
    if (date >= monthStart && date <= monthEnd) {
      monthSales += amount
      monthCost += cost

      monthSalesList.push(sale)
    }
  })

  todayCustomers = todayCustomerIds.size

  /**
   * ==========================================================
   * RETURNS
   * ==========================================================
   */

  const approvedReturns = await SalesReturn.findAll({
    where: {
      status: 'approved',

      createdAt: {
        [Op.gte]: sevenDaysStart,
        [Op.lte]: todayEnd,
      },
    },

    include: [
      {
        model: SalesReturnItem,
        as: 'ReturnItems',
        required: false,
      },
    ],
  })

  let todayReturns = 0
  let monthReturns = 0
  let totalReturns = 0

  approvedReturns.forEach((returnRecord) => {
    const amount = toNumber(returnRecord.totalRefund)

    const returnDate = new Date(
      returnRecord.createdAt,
    )

    totalReturns += amount

    if (
      returnDate >= todayStart &&
      returnDate <= todayEnd
    ) {
      todayReturns += amount
    }

    if (
      returnDate >= monthStart &&
      returnDate <= monthEnd
    ) {
      monthReturns += amount
    }
  })

  /**
   * ==========================================================
   * EXPENSES
   * ==========================================================
   */

  let todayExpenses = 0
  let monthExpenses = 0

  if (Expense) {
    const expenses = await Expense.findAll({
      where: {
        createdAt: {
          [Op.gte]: monthStart,
          [Op.lte]: monthEnd,
        },
      },

      attributes: [
        'id',
        'amount',
        'createdAt',
      ],

      raw: true,
    })

    expenses.forEach((expense) => {
      const amount = toNumber(expense.amount)

      const expenseDate = new Date(
        expense.createdAt,
      )

      if (
        expenseDate >= todayStart &&
        expenseDate <= todayEnd
      ) {
        todayExpenses += amount
      }

      if (
        expenseDate >= monthStart &&
        expenseDate <= monthEnd
      ) {
        monthExpenses += amount
      }
    })
  }

  /**
   * ==========================================================
   * MONTH PROFIT
   * ==========================================================
   *
   * Gross profit:
   *
   * Sales
   * - Returns
   * - Product Cost
   * - Expenses
   *
   * This dashboard uses the stored SaleItem costPrice so that
   * historical sales remain accurate when product cost changes.
   */

  const monthProfit =
    monthSales -
    monthReturns -
    monthCost -
    monthExpenses

  const todayProfit =
    todaySales -
    todayReturns -
    todayCost -
    todayExpenses

  /**
   * ==========================================================
   * GROSS / NET SALES
   * ==========================================================
   */

  const allSalesForDashboard = await Sale.findAll({
    where: saleWhere,

    include: [
      {
        model: SaleItem,
        as: 'SaleItems',
        required: false,

        include: [
          {
            model: Product,
            as: 'Product',
            required: false,
            attributes: [
              'id',
              'name',
              'costPrice',
            ],
          },

          {
            model: ProductVariant,
            as: 'ProductVariant',
            required: false,
            attributes: [
              'id',
              'productId',
              'costPrice',
            ],
          },
        ],
      },
    ],
  })

  let grossSales = 0
  let totalCost = 0
  let totalTransactions = 0
  let totalItemsSold = 0

  allSalesForDashboard.forEach((sale) => {
    grossSales += getSaleAmount(sale)

    totalTransactions += 1

    const items = sale.SaleItems || []

    items.forEach((item) => {
      totalItemsSold += getItemQuantity(item)
      totalCost += getItemCostValue(item)
    })
  })

  /**
   * All approved returns.
   */
  const allApprovedReturns = await SalesReturn.findAll({
    where: {
      status: 'approved',
    },

    attributes: [
      'id',
      'totalRefund',
      'createdAt',
    ],
  })

  totalReturns = allApprovedReturns.reduce(
    (sum, item) =>
      sum + toNumber(item.totalRefund),
    0,
  )

  const netSales = grossSales - totalReturns

  const averageSale =
    totalTransactions > 0
      ? netSales / totalTransactions
      : 0

  /**
   * ==========================================================
   * PAYMENT METHODS
   * ==========================================================
   */

  let cashSales = 0
  let transferSales = 0
  let posSales = 0
  let mixedSales = 0

  allSalesForDashboard.forEach((sale) => {
    const amount = getSaleAmount(sale)

    const paymentMethod = String(
      sale.paymentMethod || '',
    ).toLowerCase()

    if (paymentMethod === 'cash') {
      cashSales += amount
    }

    if (
      paymentMethod === 'transfer' ||
      paymentMethod === 'bank'
    ) {
      transferSales += amount
    }

    if (paymentMethod === 'pos') {
      posSales += amount
    }

    if (paymentMethod === 'mixed') {
      mixedSales += amount
    }
  })

  /**
   * ==========================================================
   * PRODUCT REVENUE
   * ==========================================================
   */

  let productRevenue = 0
  let productCost = 0

  allSalesForDashboard.forEach((sale) => {
    const items = sale.SaleItems || []

    items.forEach((item) => {
      productRevenue += getItemRevenue(item)
      productCost += getItemCostValue(item)
    })
  })

  /**
   * Keep these values for compatibility with the existing UI.
   *
   * Onishakara is fashion retail only.
   */
  const serviceRevenue = 0
  const staffShare = 0

  const grossProfit =
    netSales - productCost

  const totalExpenses = monthExpenses

  const ownerProfit =
    grossProfit - totalExpenses

  /**
   * ==========================================================
   * PRODUCTS
   * ==========================================================
   */

  const totalProducts = await Product.count({
    where: {
      status: 'active',
    },
  })

  const products = await Product.findAll({
    where: {
      status: 'active',
    },

    attributes: [
      'id',
      'name',
      'quantity',
      'reorderLevel',
      'costPrice',
    ],

    raw: true,
  })

  let lowStockProducts = 0
  let outOfStockProducts = 0
  let inventoryValue = 0

  products.forEach((product) => {
    const quantity = toNumber(product.quantity)
    const reorderLevel = toNumber(product.reorderLevel)
    const costPrice = toNumber(product.costPrice)

    inventoryValue += quantity * costPrice

    if (quantity <= 0) {
      outOfStockProducts += 1
    } else if (quantity <= reorderLevel) {
      lowStockProducts += 1
    }
  })

  /**
   * ==========================================================
   * CUSTOMERS
   * ==========================================================
   */

  const totalCustomers = Customer
    ? await Customer.count()
    : 0

  /**
   * ==========================================================
   * STAFF
   * ==========================================================
   */

  let totalStaff = 0

  if (Staff && User) {
    totalStaff = await Staff.count({
      include: [
        {
          model: User,
          as: 'User',
          where: {
            isActive: true,
          },
          required: true,
        },
      ],
    })
  }

  /**
   * ==========================================================
   * TOP PRODUCTS
   * ==========================================================
   */

  const productSalesMap = new Map()

  allSalesForDashboard.forEach((sale) => {
    const items = sale.SaleItems || []

    items.forEach((item) => {
      const productId = item.ProductId

      if (!productId) return

      const key = String(productId)

      if (!productSalesMap.has(key)) {
        productSalesMap.set(key, {
          ProductId: productId,
          totalSold: 0,
          Product:
            item.Product || null,
        })
      }

      const record =
        productSalesMap.get(key)

      record.totalSold += getItemQuantity(item)
    })
  })

  const topProducts = Array.from(
    productSalesMap.values(),
  )
    .sort(
      (a, b) =>
        b.totalSold - a.totalSold,
    )
    .slice(0, 10)

  /**
   * ==========================================================
   * TOP STAFF / CASHIERS
   * ==========================================================
   *
   * Old UI calls this "commission".
   *
   * For fashion retail we don't calculate commission.
   * Instead we return sales recorded by each staff member.
   */

  const staffSalesMap = new Map()

  allSalesForDashboard.forEach((sale) => {
    const recordedById =
      sale.RecordedById

    if (!recordedById) return

    const key = String(recordedById)

    if (!staffSalesMap.has(key)) {
      staffSalesMap.set(key, {
        StaffId: recordedById,
        totalSales: 0,
        totalTransactions: 0,
        totalCommission: 0,
      })
    }

    const record =
      staffSalesMap.get(key)

    record.totalSales += getSaleAmount(sale)
    record.totalTransactions += 1
  })

  const recordedUserIds = Array.from(
    staffSalesMap.keys(),
  ).map((id) => Number(id))

  let recordedUsers = []

  if (
    recordedUserIds.length &&
    User
  ) {
    recordedUsers = await User.findAll({
      where: {
        id: {
          [Op.in]: recordedUserIds,
        },
      },

      attributes: [
        'id',
        'fullname',
        'email',
        'role',
      ],
    })
  }

  const userMap = new Map(
    recordedUsers.map((user) => [
      String(user.id),
      user,
    ]),
  )

  const topStaff = Array.from(
    staffSalesMap.values(),
  )
    .map((staff) => {
      const user = userMap.get(
        String(staff.StaffId),
      )

      return {
        ...staff,

        User: user
          ? {
              id: user.id,
              fullname: user.fullname,
              email: user.email,
              role: user.role,
            }
          : null,

        /**
         * Compatibility with existing UI.
         */
        Staff: user
          ? {
              User: {
                id: user.id,
                fullname: user.fullname,
                email: user.email,
                role: user.role,
              },
            }
          : null,
      }
    })
    .sort(
      (a, b) =>
        b.totalSales - a.totalSales,
    )
    .slice(0, 10)

  /**
   * ==========================================================
   * SEVEN-DAY SALES
   * ==========================================================
   */

  const sevenDaysSales = []

  for (let index = 6; index >= 0; index--) {
    const date = new Date(now)

    date.setDate(
      date.getDate() - index,
    )

    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    let salesAmount = 0

    sales.forEach((sale) => {
      const saleDate = getSaleDate(sale)

      if (!saleDate) return

      const saleDateValue =
        new Date(saleDate)

      if (
        saleDateValue >= dayStart &&
        saleDateValue <= dayEnd
      ) {
        salesAmount += getSaleAmount(sale)
      }
    })

    sevenDaysSales.push({
      date: date.toLocaleDateString(
        'en-NG',
        {
          day: '2-digit',
          month: 'short',
        },
      ),

      sales: round(salesAmount),
    })
  }

  /**
   * ==========================================================
   * ALERTS
   * ==========================================================
   */

  const pendingCommission = 0

  const totalAlerts =
    lowStockProducts +
    outOfStockProducts

  /**
   * ==========================================================
   * RETURN DASHBOARD
   * ==========================================================
   */

  return {
    /**
     * TODAY
     */
    todaySales: round(todaySales),
    todayProfit: round(todayProfit),
    todayTransactions,
    todayCustomers,
    todayExpenses: round(todayExpenses),

    /**
     * Compatibility fields.
     */
    todayCommission: 0,

    /**
     * MONTH
     */
    monthSales: round(monthSales),
    monthProfit: round(monthProfit),
    monthExpenses: round(monthExpenses),

    /**
     * No commission in fashion retail.
     */
    monthCommission: 0,

    /**
     * SALES ANALYTICS
     */
    grossSales: round(grossSales),
    totalReturns: round(totalReturns),
    netSales: round(netSales),
    averageSale: round(averageSale),

    /**
     * REVENUE
     */
    serviceRevenue: 0,
    productRevenue: round(productRevenue),

    /**
     * Profit after product cost and expenses.
     */
    ownerProfit: round(ownerProfit),

    /**
     * No staff commission/share.
     */
    staffShare: 0,

    /**
     * PAYMENT
     */
    cashSales: round(cashSales),
    transferSales: round(transferSales),
    posSales: round(posSales),
    mixedSales: round(mixedSales),

    /**
     * BUSINESS
     */
    totalProducts,
    totalCustomers,
    totalStaff,
    inventoryValue: round(inventoryValue),

    /**
     * ALERTS
     */
    lowStockProducts,
    outOfStockProducts,
    pendingCommission: 0,
    totalAlerts,

    /**
     * TABLES
     */
    topProducts,
    topStaff,

    /**
     * CHART
     */
    sevenDaysSales,

    /**
     * Additional useful backend values.
     */
    productCost: round(productCost),
    grossProfit: round(grossProfit),
    totalExpenses: round(totalExpenses),
    totalTransactions,
    totalItemsSold,
  }
}

module.exports = dashboardService