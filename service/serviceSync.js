const Service = require('../models/Service');
const db = require('../config/offlineDb');

async function syncServices() {

    const services =
      await Service.findAll();

    for(const service of services){

        db.run(
        `
        INSERT OR REPLACE INTO services(
            id,
            name,
            price,
            duration
        )
        VALUES(?,?,?,?)
        `,
        [
            service.id,
            service.name,
            service.price,
            service.duration
        ]);

    }

}

module.exports = syncServices;