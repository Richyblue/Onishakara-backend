const syncProducts =
require('./productSync');

const syncServices =
require('./serviceSync');

const syncStaff =
require('./staffSync');

const syncCustomers =
require('./customerSync');

const syncCustomerQueue =
require('./syncCustomersQueue');

async function syncAll(){

   await syncProducts();

   await syncServices();

   await syncStaff();

   await syncCustomers();

   await syncCustomerQueue();

}

module.exports = syncAll;