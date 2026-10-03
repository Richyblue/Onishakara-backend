//const db = require('../database/offlineDb');

exports.saveSaleOffline = (payload) => {

  return new Promise((resolve, reject) => {

    db.run(
      `
      INSERT INTO sync_queue(payload)
      VALUES(?)
      `,
      [JSON.stringify(payload)],
      (err) => {

        if (err) return reject(err);

        resolve(true);
      }
    );
  });
};
