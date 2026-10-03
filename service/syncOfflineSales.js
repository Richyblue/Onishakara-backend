const db = require('../config/offlineDb');
const axios = require('axios');

async function syncOfflineSales() {

  db.all(
    `
    SELECT *
    FROM sync_queue
    WHERE synced = 0
    `,
    [],
    async (err, rows) => {

      if (err) return;

      for (const row of rows) {

        try {

          const payload =
            JSON.parse(row.payload);

          await axios.post(
            process.env.API_URL +
            '/sales/pos-sync',
            payload.body,
            {
              headers:{
                Authorization:
                  payload.user.token
              }
            }
          );

          db.run(
            `
            UPDATE sync_queue
            SET synced = 1
            WHERE id = ?
            `,
            [row.id]
          );

          if (row.type === 'held_sale') {

            const payload =
              JSON.parse(row.payload);
          
            await axios.post(
              `${process.env.API_URL}/held-sales/sync`,
              payload.body,
              {
                headers:{
                  'x-sync-mode':'offline'
                }
              }
            );
          
          }

        } catch(err) {

          console.log(
            'Still Offline'
          );

        }

      }

    }
  );

}

module.exports =
syncOfflineSales;