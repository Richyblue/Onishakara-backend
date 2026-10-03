const axios = require('axios');
const db = require('../config/sqlite');

async function syncPendingSales() {

  db.all(
    'SELECT * FROM sync_queue WHERE synced = 0',
    [],
    async (err, rows) => {

      if (err) return;

      for (const row of rows) {

        try {

          const payload = JSON.parse(row.payload);

          await axios.post(
            process.env.API_URL + '/sales/sync',
            payload
          );

          db.run(
            'UPDATE sync_queue SET synced = 1 WHERE id = ?',
            [row.id]
          );

        } catch (error) {
          console.log('Still Offline...');
        }
      }
    }
  );

  db.all(
    `
    SELECT *
    FROM held_sales
    WHERE synced = 0
    `,
    [],
    async(err,rows)=>{
   
      for(const row of rows){
   
         try{
   
            await axios.post(
   
               `${process.env.API_URL}/held-sales/sync`,
   
               {
                  holdNumber:
                    row.holdNumber,
   
                  CustomerId:
                    row.customerId,
   
                  items:
                    JSON.parse(row.items),
   
                  subtotal:
                    row.subtotal,
   
                  discount:
                    row.discount,
   
                  totalAmount:
                    row.totalAmount,
   
                  loyaltyPointsUsed:
                    row.loyaltyPointsUsed,
   
                  note:
                    row.note
               }
   
            );
   
            db.run(
              `
              UPDATE held_sales
              SET synced = 1
              WHERE id = ?
              `,
              [row.id]
            );
   
         }catch(error){
   
            console.log(
              'still offline'
            );
   
         }
   
      }
   
    }
   );
}

module.exports = syncPendingSales;