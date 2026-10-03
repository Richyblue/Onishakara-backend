const db =
require('../config/offlineDb');

const {
  printReceipt
} = require(
 '../service/printerService'
);

async function retryPrintJobs(){

  db.all(
   `
   SELECT *
   FROM print_queue
   WHERE printed = 0
   `,
   [],
   async(err,rows)=>{

      if(err) return;

      for(
        const row
        of rows
      ){

        try{

          await printReceipt(
            JSON.parse(
              row.payload
            )
          );

          db.run(
            `
            UPDATE print_queue
            SET printed = 1
            WHERE id = ?
            `,
            [row.id]
          );

        }catch(error){

          console.log(
           'Printer still unavailable'
          );

        }

      }

   }
  );

}

module.exports =
retryPrintJobs;