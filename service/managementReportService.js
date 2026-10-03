const { Op } = require("sequelize");

const Sale = require("../models/Sale");
const SaleItem = require("../models/saleItem");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Customer = require("../models/Customer");
const User = require("../models/User");
const SalesReturn = require("../models/SalesReturn");
const SalesReturnItem = require("../models/SalesReturnItem");
const Expense = require("../models/Expense");

/**
 * ============================================================
 * MANAGEMENT REPORT SERVICE
 * ============================================================
 *
 * ONISHAKARA GOLD FASHION STORE
 *
 * FASHION RETAIL ONLY
 *
 * Sales
 *   ↓
 * Approved Returns
 *   ↓
 * Net Sales
 *   ↓
 * COGS
 *   ↓
 * Gross Profit
 *   ↓
 * Operating Expenses
 *   ↓
 * Net Profit
 *
 * No:
 * - Services
 * - Service providers
 * - Commissions
 * - Home service
 * - Staff commission
 *
 * ============================================================
 */

const managementReportService = async (where = {}) => {
    /*
    |--------------------------------------------------------------------------
    | SALES
    |--------------------------------------------------------------------------
    */

    const sales = await Sale.findAll({
        where,

        include: [
            /*
            |--------------------------------------------------------------------------
            | CUSTOMER
            |--------------------------------------------------------------------------
            */

            {
                model: Customer,
                as: "Customer",
                attributes: [
                    "id",
                    "fullname",
                    "phone",
                ],
                required: false,
            },

            /*
            |--------------------------------------------------------------------------
            | CASHIER
            |--------------------------------------------------------------------------
            */

            {
                model: User,
                as: "RecordedBy",
                attributes: [
                    "id",
                    "fullname",
                ],
                required: false,
            },

            /*
            |--------------------------------------------------------------------------
            | SALE ITEMS
            |--------------------------------------------------------------------------
            */

            {
                model: SaleItem,
                as: "SaleItems",
                required: false,

                include: [
                    {
                        model: Product,
                        as: "Product",
                        attributes: [
                            "id",
                            "name",
                            "sku",
                            "barcode",
                            "costPrice",
                            "sellingPrice",
                            "quantity",
                            "image",
                        ],
                        required: false,
                    },

                    {
                        model: ProductVariant,
                        as: "ProductVariant",
                        attributes: [
                            "id",
                            "productId",
                            "size",
                            "color",
                            "sku",
                            "barcode",
                            "costPrice",
                            "sellingPrice",
                            "quantity",
                            "image",
                        ],
                        required: false,
                    },
                ],
            },

            /*
            |--------------------------------------------------------------------------
            | APPROVED RETURNS
            |--------------------------------------------------------------------------
            */

            {
                model: SalesReturn,
                as: "SalesReturns",
                required: false,

                where: {
                    status: "approved",
                },

                include: [
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
            },
        ],

        order: [
            ["createdAt", "DESC"],
        ],
    });


    /*
    |--------------------------------------------------------------------------
    | EXPENSE DATE FILTER
    |--------------------------------------------------------------------------
    |
    | Sales use createdAt because the report controller normally builds
    | the sales date range using createdAt.
    |
    | Expenses should use expenseDate.
    |
    */

    const expenseWhere = {};

    if (where.createdAt) {
        expenseWhere.expenseDate = where.createdAt;
    }


    /*
    |--------------------------------------------------------------------------
    | EXPENSES
    |--------------------------------------------------------------------------
    */

    const expenses = await Expense.findAll({
        where: expenseWhere,

        order: [
            ["expenseDate", "DESC"],
            ["createdAt", "DESC"],
        ],
    });


    /*
    |--------------------------------------------------------------------------
    | KPI VARIABLES
    |--------------------------------------------------------------------------
    */

    let grossSales = 0;
    let totalReturns = 0;
    let netSales = 0;

    let productRevenue = 0;
    let productCost = 0;
    let grossProfit = 0;

    let totalExpenses = 0;
    let netProfit = 0;

    let totalItemsSold = 0;
    let totalReturnedItems = 0;

    let cashSales = 0;
    let transferSales = 0;
    let posSales = 0;
    let mixedSales = 0;

    const customers = new Set();

    const cashierSalesMap = new Map();
    const productSalesMap = new Map();
    const variantSalesMap = new Map();


    /*
    |--------------------------------------------------------------------------
    | PROCESS SALES
    |--------------------------------------------------------------------------
    */

    sales.forEach((sale) => {

        const saleAmount = Number(
            sale.totalAmount || 0
        );

        grossSales += saleAmount;


        /*
        |--------------------------------------------------------------------------
        | CUSTOMER
        |--------------------------------------------------------------------------
        */

        if (sale.CustomerId) {
            customers.add(
                Number(sale.CustomerId)
            );
        }


        /*
        |--------------------------------------------------------------------------
        | PAYMENT METHOD
        |--------------------------------------------------------------------------
        */

        switch (sale.paymentMethod) {

            case "cash":
                cashSales += saleAmount;
                break;

            case "transfer":
                transferSales += saleAmount;
                break;

            case "pos":
                posSales += saleAmount;
                break;

            case "mixed":
                mixedSales += saleAmount;
                break;

            default:
                break;
        }


        /*
        |--------------------------------------------------------------------------
        | CASHIER
        |--------------------------------------------------------------------------
        */

        const cashierId = sale.RecordedById
            ? Number(sale.RecordedById)
            : 0;

        const cashierName =
            sale.RecordedBy?.fullname ||
            "Unknown Cashier";


        if (!cashierSalesMap.has(cashierId)) {

            cashierSalesMap.set(
                cashierId,
                {
                    userId: cashierId || null,
                    cashier: cashierName,
                    transactions: 0,
                    sales: 0,
                    returns: 0,
                    netSales: 0,
                }
            );
        }


        const cashier =
            cashierSalesMap.get(cashierId);


        cashier.transactions += 1;
        cashier.sales += saleAmount;


        /*
        |--------------------------------------------------------------------------
        | RETURNS
        |--------------------------------------------------------------------------
        */

        const saleReturns =
            sale.SalesReturns || [];


        let saleReturnAmount = 0;


        saleReturns.forEach(
            (returnRecord) => {

                saleReturnAmount += Number(
                    returnRecord.totalRefund || 0
                );
            }
        );


        totalReturns += saleReturnAmount;

        cashier.returns += saleReturnAmount;

        cashier.netSales +=
            saleAmount -
            saleReturnAmount;


        /*
        |--------------------------------------------------------------------------
        | SALE ITEMS
        |--------------------------------------------------------------------------
        */

        const saleItems =
            sale.SaleItems || [];


        saleItems.forEach((item) => {

            const originalQuantity =
                Number(item.quantity || 0);


            const originalSubtotal =
                Number(item.subtotal || 0);


            /*
            |--------------------------------------------------------------------------
            | RETURNED QUANTITY
            |--------------------------------------------------------------------------
            */

            let returnedQuantity = 0;


            saleReturns.forEach(
                (returnRecord) => {

                    const returnItems =
                        returnRecord.ReturnItems || [];


                    returnItems.forEach(
                        (returnItem) => {

                            const returnSaleItemId =
                                Number(
                                    returnItem.SaleItemId || 0
                                );


                            /*
                            |--------------------------------------------------------------------------
                            | PRIMARY MATCH
                            |--------------------------------------------------------------------------
                            */

                            if (
                                returnSaleItemId > 0 &&
                                returnSaleItemId ===
                                    Number(item.id)
                            ) {

                                returnedQuantity +=
                                    Number(
                                        returnItem.quantity || 0
                                    );

                                return;
                            }


                            /*
                            |--------------------------------------------------------------------------
                            | LEGACY MATCH
                            |--------------------------------------------------------------------------
                            */

                            const sameProduct =
                                Number(
                                    returnItem.ProductId || 0
                                ) ===
                                Number(
                                    item.ProductId || 0
                                );


                            const returnVariantId =
                                Number(
                                    returnItem.ProductVariantId || 0
                                );


                            const saleVariantId =
                                Number(
                                    item.ProductVariantId || 0
                                );


                            if (
                                !returnSaleItemId &&
                                sameProduct &&
                                returnVariantId ===
                                    saleVariantId
                            ) {

                                returnedQuantity +=
                                    Number(
                                        returnItem.quantity || 0
                                    );
                            }
                        }
                    );
                }
            );


            /*
            |--------------------------------------------------------------------------
            | SAFETY CAP
            |--------------------------------------------------------------------------
            */

            returnedQuantity =
                Math.min(
                    Math.max(
                        returnedQuantity,
                        0
                    ),
                    originalQuantity
                );


            /*
            |--------------------------------------------------------------------------
            | REMAINING QUANTITY
            |--------------------------------------------------------------------------
            */

            const remainingQuantity =
                Math.max(
                    originalQuantity -
                        returnedQuantity,
                    0
                );


            totalReturnedItems +=
                returnedQuantity;


            totalItemsSold +=
                remainingQuantity;


            /*
            |--------------------------------------------------------------------------
            | UNIT SELLING PRICE
            |--------------------------------------------------------------------------
            */

            const unitPrice =
                originalQuantity > 0
                    ? originalSubtotal /
                      originalQuantity
                    : Number(item.price || 0);


            /*
            |--------------------------------------------------------------------------
            | REMAINING REVENUE
            |--------------------------------------------------------------------------
            */

            const remainingRevenue =
                remainingQuantity *
                unitPrice;


            productRevenue +=
                remainingRevenue;


            /*
            |--------------------------------------------------------------------------
            | HISTORICAL COST
            |--------------------------------------------------------------------------
            |
            | Priority:
            |
            | 1. SaleItem.costPrice
            | 2. Variant.costPrice
            | 3. Product.costPrice
            |
            */

            let costPrice =
                Number(
                    item.costPrice || 0
                );


            if (
                costPrice <= 0 &&
                item.ProductVariant
            ) {

                costPrice =
                    Number(
                        item.ProductVariant.costPrice || 0
                    );
            }


            if (
                costPrice <= 0 &&
                item.Product
            ) {

                costPrice =
                    Number(
                        item.Product.costPrice || 0
                    );
            }


            /*
            |--------------------------------------------------------------------------
            | REMAINING COGS
            |--------------------------------------------------------------------------
            */

            const remainingCost =
                remainingQuantity *
                costPrice;


            productCost +=
                remainingCost;


            /*
            |--------------------------------------------------------------------------
            | GROSS PROFIT
            |--------------------------------------------------------------------------
            */

            grossProfit +=
                remainingRevenue -
                remainingCost;


            /*
            |--------------------------------------------------------------------------
            | PRODUCT BREAKDOWN
            |--------------------------------------------------------------------------
            */

            const productId =
                Number(
                    item.ProductId || 0
                );


            const productName =
                item.Product?.name ||
                "Unknown Product";


            if (productId > 0) {

                if (
                    !productSalesMap.has(productId)
                ) {

                    productSalesMap.set(
                        productId,
                        {
                            productId,
                            product: productName,
                            quantity: 0,
                            revenue: 0,
                            cost: 0,
                            profit: 0,
                        }
                    );
                }


                const productSummary =
                    productSalesMap.get(
                        productId
                    );


                productSummary.quantity +=
                    remainingQuantity;


                productSummary.revenue +=
                    remainingRevenue;


                productSummary.cost +=
                    remainingCost;


                productSummary.profit +=
                    remainingRevenue -
                    remainingCost;
            }


            /*
            |--------------------------------------------------------------------------
            | VARIANT BREAKDOWN
            |--------------------------------------------------------------------------
            */

            const variantId =
                Number(
                    item.ProductVariantId || 0
                );


            if (variantId > 0) {

                const variantName =
                    [
                        item.ProductVariant?.size,
                        item.ProductVariant?.color,
                    ]
                        .filter(Boolean)
                        .join(" / ") ||
                    item.ProductVariant?.sku ||
                    "Variant";


                if (
                    !variantSalesMap.has(
                        variantId
                    )
                ) {

                    variantSalesMap.set(
                        variantId,
                        {
                            variantId,
                            productId,
                            product: productName,
                            variant: variantName,
                            size:
                                item.ProductVariant?.size ||
                                null,
                            color:
                                item.ProductVariant?.color ||
                                null,
                            quantity: 0,
                            revenue: 0,
                            cost: 0,
                            profit: 0,
                        }
                    );
                }


                const variantSummary =
                    variantSalesMap.get(
                        variantId
                    );


                variantSummary.quantity +=
                    remainingQuantity;


                variantSummary.revenue +=
                    remainingRevenue;


                variantSummary.cost +=
                    remainingCost;


                variantSummary.profit +=
                    remainingRevenue -
                    remainingCost;
            }
        });
    });


    /*
    |--------------------------------------------------------------------------
    | NET SALES
    |--------------------------------------------------------------------------
    */

    netSales =
        grossSales -
        totalReturns;


    /*
    |--------------------------------------------------------------------------
    | TOTAL EXPENSES
    |--------------------------------------------------------------------------
    */

    totalExpenses =
        expenses.reduce(
            (sum, expense) => {

                return (
                    sum +
                    Number(
                        expense.amount || 0
                    )
                );
            },
            0
        );


    /*
    |--------------------------------------------------------------------------
    | NET PROFIT
    |--------------------------------------------------------------------------
    */

    netProfit =
        grossProfit -
        totalExpenses;


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
    | CASHIER SALES
    |--------------------------------------------------------------------------
    */

    const cashierSales =
        Array.from(
            cashierSalesMap.values()
        ).map((item) => ({
            ...item,

            sales: Number(
                item.sales.toFixed(2)
            ),

            returns: Number(
                item.returns.toFixed(2)
            ),

            netSales: Number(
                item.netSales.toFixed(2)
            ),
        }));


    /*
    |--------------------------------------------------------------------------
    | PRODUCT SALES
    |--------------------------------------------------------------------------
    */

    const productSales =
        Array.from(
            productSalesMap.values()
        )
        .map((item) => ({
            ...item,

            quantity:
                Number(item.quantity),

            revenue:
                Number(
                    item.revenue.toFixed(2)
                ),

            cost:
                Number(
                    item.cost.toFixed(2)
                ),

            profit:
                Number(
                    item.profit.toFixed(2)
                ),
        }))
        .sort(
            (a, b) =>
                b.revenue -
                a.revenue
        );


    /*
    |--------------------------------------------------------------------------
    | VARIANT SALES
    |--------------------------------------------------------------------------
    */

    const variantSales =
        Array.from(
            variantSalesMap.values()
        )
        .map((item) => ({
            ...item,

            quantity:
                Number(item.quantity),

            revenue:
                Number(
                    item.revenue.toFixed(2)
                ),

            cost:
                Number(
                    item.cost.toFixed(2)
                ),

            profit:
                Number(
                    item.profit.toFixed(2)
                ),
        }))
        .sort(
            (a, b) =>
                b.revenue -
                a.revenue
        );


    /*
    |--------------------------------------------------------------------------
    | TOP PRODUCTS
    |--------------------------------------------------------------------------
    */

    const topProducts =
        productSales.slice(0, 10);


    /*
    |--------------------------------------------------------------------------
    | TOP VARIANTS
    |--------------------------------------------------------------------------
    */

    const topVariants =
        variantSales.slice(0, 10);


    /*
    |--------------------------------------------------------------------------
    | FORMAT SALES
    |--------------------------------------------------------------------------
    */

    const formattedSales =
        sales.map((sale) => {

            const data =
                sale.toJSON
                    ? sale.toJSON()
                    : sale;


            const saleReturns =
                data.SalesReturns || [];


            const returnAmount =
                saleReturns.reduce(
                    (
                        sum,
                        returnRecord
                    ) =>
                        sum +
                        Number(
                            returnRecord.totalRefund || 0
                        ),
                    0
                );


            const grossAmount =
                Number(
                    data.totalAmount || 0
                );


            return {
                ...data,

                grossAmount,

                returnAmount:
                    Number(
                        returnAmount.toFixed(2)
                    ),

                netAmount:
                    Number(
                        (
                            grossAmount -
                            returnAmount
                        ).toFixed(2)
                    ),
            };
        });


    /*
    |--------------------------------------------------------------------------
    | RETURN REPORT
    |--------------------------------------------------------------------------
    */

    const returns = [];


    sales.forEach((sale) => {

        const saleReturns =
            sale.SalesReturns || [];


        saleReturns.forEach(
            (returnRecord) => {

                returns.push(
                    returnRecord.toJSON
                        ? returnRecord.toJSON()
                        : returnRecord
                );
            }
        );
    });


    /*
    |--------------------------------------------------------------------------
    | ROUND MAIN KPIs
    |--------------------------------------------------------------------------
    */

    grossSales =
        Number(
            grossSales.toFixed(2)
        );

    totalReturns =
        Number(
            totalReturns.toFixed(2)
        );

    netSales =
        Number(
            netSales.toFixed(2)
        );

    productRevenue =
        Number(
            productRevenue.toFixed(2)
        );

    productCost =
        Number(
            productCost.toFixed(2)
        );

    grossProfit =
        Number(
            grossProfit.toFixed(2)
        );

    totalExpenses =
        Number(
            totalExpenses.toFixed(2)
        );

    netProfit =
        Number(
            netProfit.toFixed(2)
        );


    /*
    |--------------------------------------------------------------------------
    | FINAL RESPONSE
    |--------------------------------------------------------------------------
    */

    return {

        /*
        |--------------------------------------------------------------------------
        | SALES KPIs
        |--------------------------------------------------------------------------
        */

        grossSales,

        totalReturns,

        netSales,

        totalTransactions:
            sales.length,

        customersServed:
            customers.size,

        itemsSold:
            totalItemsSold,

        returnedItems:
            totalReturnedItems,

        averageSale:
            Number(
                averageSale.toFixed(2)
            ),


        /*
        |--------------------------------------------------------------------------
        | PAYMENT BREAKDOWN
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | PRODUCT FINANCIALS
        |--------------------------------------------------------------------------
        */

        productRevenue,

        productCost,

        grossProfit,


        /*
        |--------------------------------------------------------------------------
        | EXPENSES
        |--------------------------------------------------------------------------
        */

        totalExpenses,

        netProfit,


        /*
        |--------------------------------------------------------------------------
        | BREAKDOWNS
        |--------------------------------------------------------------------------
        */

        cashierSales,

        productSales,

        variantSales,

        topProducts,

        topVariants,


        /*
        |--------------------------------------------------------------------------
        | SALES
        |--------------------------------------------------------------------------
        */

        sales:
            formattedSales,


        /*
        |--------------------------------------------------------------------------
        | RETURNS
        |--------------------------------------------------------------------------
        */

        returns,

    };
};


module.exports =
    managementReportService;