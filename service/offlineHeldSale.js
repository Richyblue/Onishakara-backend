const db = require('../config/offlineDb');

exports.saveHeldSaleOffline = (sale) => {

  return new Promise((resolve,reject)=>{

    db.run(
      `
      INSERT INTO held_sales(
        holdNumber,
        customerId,
        heldById,
        items,
        subtotal,
        discount,
        totalAmount,
        loyaltyPointsUsed,
        note
      )
      VALUES(?,?,?,?,?,?,?,?,?)
      `,
      [
        sale.holdNumber,
        sale.customerId,
        sale.heldById,
        JSON.stringify(sale.items),
        sale.subtotal,
        sale.discount,
        sale.totalAmount,
        sale.loyaltyPointsUsed,
        sale.note
      ],
      function(err){

        if(err) return reject(err);

        resolve(this.lastID);

      }
    );

  });

}