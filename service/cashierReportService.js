const Sale = require("../models/Sale");
const SaleItem = require("../models/saleItem");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Customer = require("../models/Customer");
const User = require("../models/User");
const SalesReturn = require("../models/SalesReturn");
const SalesReturnItem = require("../models/SalesReturnItem");

const cashierReportService = async (where = {}) => {
    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    */

    const sales = await Sale.findAll({
        where,

        include: [
            {
                model: Customer,
                attributes: [
                    "id",
                    "fullname",
                ],
                required: false,
            },

            {
                model: User,
                as: "RecordedBy",
                attributes: [
                    "id",
                    "fullname",
                ],
                required: false,
            },

            {
                model: SaleItem,
                as: "SaleItems",
                required: false,

                include: [
                    {
                        model: Product,
                        as: "Product",
                        required: false,
                    },

                    {
                        model: ProductVariant,
                        as: "ProductVariant",
                        required: false,
                    },
                ],
            },
        ],

        order: [
            ["createdAt", "DESC"],
        ],
    });

    /*
    |--------------------------------------------------------------------------
    | RETURNS
    |--------------------------------------------------------------------------
    |
    | Only approved returns belonging to this cashier's sales are counted.
    |
    */

    const returnWhere = {
        status: "approved",
    };

    if (where.createdAt) {
        returnWhere.createdAt = where.createdAt;
    }

    const returns = await SalesReturn.findAll({
        where: returnWhere,

        include: [
            {
                model: Sale,

                as: "Sale",

                where: where.RecordedById
                    ? {
                        RecordedById: where.RecordedById,
                    }
                    : {},

                attributes: [
                    "id",
                    "RecordedById",
                    "totalAmount",
                ],

                required: true,
            },

            {
                model: SalesReturnItem,
                as: "ReturnItems",
                required: false,

                include: [
                    {
                        model: Product,
                        as: "Product",
                        required: false,
                    },

                    {
                        model: ProductVariant,
                        as: "ProductVariant",
                        required: false,
                    },
                ],
            },
        ],
    });

    /*
    |--------------------------------------------------------------------------
    | INITIAL VALUES
    |--------------------------------------------------------------------------
    */

    let grossSales = 0;

    let totalReturns = 0;

    let netSales = 0;

    let cashSales = 0;

    let transferSales = 0;

    let posSales = 0;

    let mixedSales = 0;

    let totalItemsSold = 0;

    /*
    |--------------------------------------------------------------------------
    | UNIQUE CUSTOMERS
    |--------------------------------------------------------------------------
    */

    const customers = new Set();

    /*
    |--------------------------------------------------------------------------
    | PROCESS SALES
    |--------------------------------------------------------------------------
    */

    sales.forEach((sale) => {
        const amount = Number(
            sale.totalAmount || 0
        );

        grossSales += amount;

        /*
        | Customer count
        */

        if (sale.CustomerId) {
            customers.add(sale.CustomerId);
        }

        /*
        | Payment breakdown
        */

        switch (sale.paymentMethod) {
            case "cash":
                cashSales += amount;
                break;

            case "transfer":
                transferSales += amount;
                break;

            case "pos":
                posSales += amount;
                break;

            case "mixed":
                mixedSales += amount;
                break;

            default:
                break;
        }

        /*
        | Product quantities
        */

        (sale.SaleItems || []).forEach((item) => {
            totalItemsSold += Number(
                item.quantity || 0
            );
        });
    });

    /*
    |--------------------------------------------------------------------------
    | TOTAL RETURNS
    |--------------------------------------------------------------------------
    */

    totalReturns = returns.reduce(
        (sum, item) =>
            sum + Number(
                item.totalRefund || 0
            ),
        0
    );

    /*
    |--------------------------------------------------------------------------
    | NET SALES
    |--------------------------------------------------------------------------
    */

    netSales = grossSales - totalReturns;

    /*
    |--------------------------------------------------------------------------
    | AVERAGE SALE
    |--------------------------------------------------------------------------
    */

    const averageSale =
        sales.length > 0
            ? netSales / sales.length
            : 0;

    /*
    |--------------------------------------------------------------------------
    | RETURNED ITEM QUANTITY
    |--------------------------------------------------------------------------
    */

    const totalReturnedItems = returns.reduce(
        (sum, returnRecord) => {
            const items =
                returnRecord.ReturnItems || [];

            return (
                sum +
                items.reduce(
                    (itemSum, item) =>
                        itemSum +
                        Number(
                            item.quantity || 0
                        ),
                    0
                )
            );
        },
        0
    );

    /*
    |--------------------------------------------------------------------------
    | FINAL REPORT
    |--------------------------------------------------------------------------
    */

    return {
        grossSales: Number(
            grossSales.toFixed(2)
        ),

        totalReturns: Number(
            totalReturns.toFixed(2)
        ),

        netSales: Number(
            netSales.toFixed(2)
        ),

        totalTransactions:
            sales.length,

        customersServed:
            customers.size,

        itemsSold:
            totalItemsSold,

        totalReturnedItems:
            totalReturnedItems,

        averageSale:
            Number(
                averageSale.toFixed(2)
            ),

        cashSales:
            Number(
                cashSales.toFixed(2)
            ),

        transferSales:
            Number(
                transferSales.toFixed(2)
            ),

        posSales:
            Number(
                posSales.toFixed(2)
            ),

        mixedSales:
            Number(
                mixedSales.toFixed(2)
            ),

        sales: sales || [],
    };
};

module.exports = cashierReportService;