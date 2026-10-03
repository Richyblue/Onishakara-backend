//const db =require('../config/offlineDb');

exports.savePrintJob =
(payload)=>{

  return new Promise(
    (resolve,reject)=>{

      db.run(
        `
        INSERT INTO print_queue(
          payload
        )
        VALUES(?)
        `,
        [
          JSON.stringify(payload)
        ],
        (err)=>{

          if(err)
            return reject(err);

          resolve(true);

        }
      );

    }
  );

};
