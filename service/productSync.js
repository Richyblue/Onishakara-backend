const Product = require('../models/Product');
const db = require('../config/offlineDb');

async function syncProducts() {

    const products =
      await Product.findAll();

    for (const product of products) {

        db.run(
        `
        INSERT OR REPLACE INTO products (
            id,
            name,
            sku,
            barcode,
            costPrice,
            sellingPrice,
            quantity,
            reorderLevel,
            image,
            status
        )
        VALUES (?,?,?,?,?,?,?,?,?,?)
        `,
        [
            product.id,
            product.name,
            product.sku,
            product.barcode,
            product.costPrice,
            product.sellingPrice,
            product.quantity,
            product.reorderLevel,
            product.image,
            product.status
        ]);

    }

}

module.exports = syncProducts;