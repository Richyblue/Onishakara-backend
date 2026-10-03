const {
  printReceipt: thermalPrintReceipt,
} = require('../service/printerService')

exports.printReceipt = async (req, res) => {
  try {
    await thermalPrintReceipt(req.body)

    return res.json({
      success: true,
      message: 'Receipt printed successfully',
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}
