const {
    ThermalPrinter,
    PrinterTypes,
  } = require('node-thermal-printer')
  
  const printReceipt = async (sale) => {
    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
  
      /*
        Windows:
        printer:XP-80
  
        Mac:
        printer:XP-80
  
        Linux:
        printer:XP-80
      */
  
      interface: 'printer:XP-80C',
  
      options: {
        timeout: 5000,
      },
    })
  
    const isConnected =
      await printer.isPrinterConnected()
  
    if (!isConnected) {
      throw new Error(
        'Thermal printer not connected',
      )
    }
  
    printer.alignCenter()
  
    printer.bold(true)
  
    printer.println('IZY SALON')
  
    printer.bold(false)
  
    printer.println('Sales Receipt')
  
    printer.drawLine()
  
    printer.alignLeft()
  
    printer.println(
      `Receipt: ${sale.receiptNumber}`,
    )
  
    printer.println(
      `Customer: ${sale.customer}`,
    )
  
    printer.println(
      `Cashier: ${sale.recordedBy}`,
    )
  
    printer.println(
      `Provider: ${sale.serviceProvider || '-'}`,
    )
  
    printer.println(
      `Payment: ${sale.paymentMethod}`,
    )
  
    printer.drawLine()
  
    sale.items.forEach((item) => {
      printer.println(item.name)
  
      printer.leftRight(
        `${item.quantity} x`,
        `₦${item.subtotal}`,
      )
    })
  
    printer.drawLine()
  
    printer.leftRight(
      'Subtotal',
      `₦${sale.subtotal}`,
    )
  
    printer.leftRight(
      'Discount',
      `₦${sale.discount}`, 
    )
  
    printer.leftRight(
      'Total',
      `₦${sale.totalAmount}`,
    )
  
    printer.drawLine()
  
    printer.println(
      `Points Earned: ${
        sale.loyaltyPointsEarned || 0
      }`,
    )
  
    printer.println(
      `Balance: ${
        sale.remainingPoints || 0
      }`,
    )
  
    printer.drawLine()
  
    printer.alignCenter()
  
    printer.println(
      'Thank You For Your Patronage',
    )
  
    printer.cut()
  
    await printer.execute()
  }
  
  module.exports = {
    printReceipt,
  }