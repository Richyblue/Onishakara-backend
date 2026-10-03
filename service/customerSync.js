const Customer = require('../models/Customer');
const db = require('../config/offlineDb');

async function syncCustomers() {

    const customers =
      await Customer.findAll();

    for (const customer of customers) {

        db.run(
        `
        INSERT OR REPLACE INTO customers(
            id,
            fullname,
            phone,
            email,
            loyaltyPoints
        )
        VALUES(?,?,?,?,?)
        `,
        [
            customer.id,
            customer.fullname,
            customer.phone,
            customer.email,
            customer.loyaltyPoints || 0
        ]);

    }

}

module.exports = syncCustomers;