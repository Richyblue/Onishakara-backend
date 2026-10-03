const { Op, fn, col } = require('sequelize')
const Sale = require('../models/Sale')

exports.getMyDailyReport = async (
  req,
  res,
) => {
  try {
    const userId = req.user.id

    const today = new Date()

    const startOfDay = new Date(
      today.setHours(0, 0, 0, 0),
    )

    const endOfDay = new Date(
      today.setHours(23, 59, 59, 999),
    )

    const sales = await Sale.findAll({
      where: {
        UserId: userId,
        createdAt: {
          [Op.between]: [
            startOfDay,
            endOfDay,
          ],
        },
      },
    })

    const mySales = sales.reduce(
      (sum, sale) =>
        sum +
        Number(
          sale.totalAmount || 0,
        ),
      0,
    )

    const myTransactions =
      sales.length

    const averageSale =
      myTransactions > 0
        ? mySales /
          myTransactions
        : 0

    const cashSales = sales
      .filter(
        (s) =>
          s.paymentMethod ===
          'Cash',
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      )

    const transferSales = sales
      .filter(
        (s) =>
          s.paymentMethod ===
          'Transfer',
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      )

    const cardSales = sales
      .filter(
        (s) =>
          s.paymentMethod ===
          'Card' ||
          s.paymentMethod ===
            'POS',
      )
      .reduce(
        (sum, sale) =>
          sum +
          Number(
            sale.totalAmount || 0,
          ),
        0,
      )

    const uniqueCustomers =
      new Set(
        sales.map(
          (s) => s.customer,
        ),
      )

    return res.json({
      success: true,

      cashierName:
        req.user.fullname,

      reportDate:
        startOfDay.toLocaleDateString(),

      mySales,

      myTransactions,

      myCustomers:
        uniqueCustomers.size,

      averageSale,

      cashSales,

      transferSales,

      cardSales,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message:
        'Failed to load report',
    })
  }
}
