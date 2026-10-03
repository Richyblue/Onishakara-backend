const axios =
require('axios');

const db =
require('../config/offlineDb');

async function syncCustomerQueue(){

  db.all(
   `
   SELECT *
   FROM customer_queue
   WHERE synced = 0
   `,
   [],
   async(err,rows)=>{

      if(err) return;

      for(
        const row
        of rows
      ){

        try{

          const payload =
          JSON.parse(
            row.payload
          );

          await axios.post(

            `${process.env.API_URL}/customers`,

            payload

          );

          db.run(
           `
           UPDATE customer_queue
           SET synced = 1
           WHERE id = ?
           `,
           [row.id]
          );

        }catch(error){

          console.log(
            'Still Offline'
          );

        }

      }

   }
  );

}

module.exports =
syncCustomerQueue;