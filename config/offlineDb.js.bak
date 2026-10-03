const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./offline.db', (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('SQLite Connected');
  }
});

db.serialize(() => {

    db.run(`
        CREATE TABLE IF NOT EXISTS sync_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          payload TEXT,
          synced INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

    db.run(`
      CREATE TABLE IF NOT EXISTS held_sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        holdNumber TEXT,
        customerId INTEGER,
        heldById INTEGER,
        items TEXT,
        subtotal REAL,
        discount REAL,
        totalAmount REAL,
        loyaltyPointsUsed REAL,
        note TEXT,
        status TEXT DEFAULT 'held',
        synced INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY,
            name TEXT,
            sku TEXT,
            barcode TEXT,
            costPrice REAL,
            sellingPrice REAL,
            quantity INTEGER,
            reorderLevel INTEGER,
            image TEXT,
            status TEXT,
            synced INTEGER DEFAULT 1
        )
        `);

        db.run(`
            CREATE TABLE IF NOT EXISTS services (
                id INTEGER PRIMARY KEY,
                name TEXT,
                price REAL,
                duration INTEGER,
                synced INTEGER DEFAULT 1
            )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS print_queue (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  payload TEXT,
                  printed INTEGER DEFAULT 0,
                  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                )
                `);

                db.run(`
                    CREATE TABLE IF NOT EXISTS staffs (
                        id INTEGER PRIMARY KEY,
                        userId INTEGER,
                        fullname TEXT,
                        email TEXT,
                        phone TEXT,
                        role TEXT,
                        isActive INTEGER,
                        position TEXT,
                        salary REAL,
                        employmentType TEXT,
                        hmoProvider TEXT,
                        hmoNumber TEXT,
                        commissionRate REAL,
                        commissionCycle TEXT
                    )
                    `);

                    db.run(`
                        CREATE TABLE IF NOT EXISTS customers (
                            id INTEGER PRIMARY KEY,
                            fullname TEXT,
                            phone TEXT,
                            email TEXT,
                            loyaltyPoints INTEGER DEFAULT 0,
                            synced INTEGER DEFAULT 1,
                            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                        `);

                        db.run(`
                            CREATE TABLE IF NOT EXISTS customer_queue (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                payload TEXT,
                                synced INTEGER DEFAULT 0,
                                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
                            )
                            `);
  
  });

module.exports = db;