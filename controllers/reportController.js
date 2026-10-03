const { Op } = require("sequelize");

const Sale = require("../models/Sale");
const SaleItem = require("../models/saleItem");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Customer = require("../models/Customer");
const User = require("../models/User");

const managementReportService = require("../service/managementReportService");
const cashierReportService = require("../service/cashierReportService");

/**
 * ============================================================
 * DATE HELPERS
 * ============================================================
 */

const startOfDay = (date) => {
    const d = new Date(date);

    d.setHours(0, 0, 0, 0);

    return d;
};

const endOfDay = (date) => {
    const d = new Date(date);

    d.setHours(23, 59, 59, 999);

    return d;
};

/**
 * Build a Sequelize date condition.
 */
const buildDateCondition = (startDate, endDate) => {
    if (!startDate && !endDate) {
        return null;
    }

    if (startDate && endDate) {
        return {
            [Op.between]: [
                startOfDay(startDate),
                endOfDay(endDate),
            ],
        };
    }

    if (startDate) {
        return {
            [Op.gte]: startOfDay(startDate),
        };
    }

    return {
        [Op.lte]: endOfDay(endDate),
    };
};

/**
 * ============================================================
 * MANAGEMENT SALES REPORT
 * ============================================================
 */

exports.getSalesReport = async (req, res) => {
    try {
        const {
            startDate,
            endDate,
            status,
        } = req.query;

        const where = {};

        const dateCondition = buildDateCondition(
            startDate,
            endDate
        );

        if (dateCondition) {
            where.createdAt = dateCondition;
        }

        /**
         * Only apply approval status when explicitly requested.
         */
        if (status) {
            where.approvalStatus = status;
        }

        const report = await managementReportService(where);

        return res.status(200).json({
            success: true,
            ...report,
        });

    } catch (error) {

        console.error(
            "GET SALES REPORT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to generate sales report",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

/**
 * ============================================================
 * CASHIER / MY SALES REPORT
 * ============================================================
 *
 * This endpoint returns sales belonging to the logged-in cashier.
 *
 * Fashion retail only:
 * - No services
 * - No service providers
 * - No commissions
 * - No CardNumber
 * - No StandTag
 */

exports.mySalesReport = async (req, res) => {
    try {

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const userId = Number(req.user.id);

        if (!Number.isInteger(userId) || userId <= 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid authenticated user",
            });
        }

        const {
            period = "today",
            startDate,
            endDate,
        } = req.query;

        const where = {
            RecordedById: userId,
            approvalStatus: "approved",
            status: "completed",
        };

        /**
         * --------------------------------------------------------
         * PERIOD FILTER
         * --------------------------------------------------------
         */

        const now = new Date();

        if (startDate || endDate) {

            const customDateCondition = buildDateCondition(
                startDate,
                endDate
            );

            if (customDateCondition) {
                where.createdAt = customDateCondition;
            }

        } else {

            switch (period) {

                case "today": {
                    where.createdAt = {
                        [Op.between]: [
                            startOfDay(now),
                            endOfDay(now),
                        ],
                    };

                    break;
                }

                case "yesterday": {

                    const yesterday = new Date(now);

                    yesterday.setDate(
                        yesterday.getDate() - 1
                    );

                    where.createdAt = {
                        [Op.between]: [
                            startOfDay(yesterday),
                            endOfDay(yesterday),
                        ],
                    };

                    break;
                }

                case "this_week": {

                    const start = new Date(now);

                    const day =
                        start.getDay() === 0
                            ? 7
                            : start.getDay();

                    start.setDate(
                        start.getDate() - day + 1
                    );

                    where.createdAt = {
                        [Op.between]: [
                            startOfDay(start),
                            endOfDay(now),
                        ],
                    };

                    break;
                }

                case "this_month": {

                    const start = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        1
                    );

                    where.createdAt = {
                        [Op.between]: [
                            startOfDay(start),
                            endOfDay(now),
                        ],
                    };

                    break;
                }

                case "all":
                    // No date restriction.
                    break;

                default: {

                    /**
                     * Unknown period falls back to today.
                     */
                    where.createdAt = {
                        [Op.between]: [
                            startOfDay(now),
                            endOfDay(now),
                        ],
                    };

                    break;
                }
            }
        }

        /**
         * --------------------------------------------------------
         * GENERATE REPORT
         * --------------------------------------------------------
         */

        const report = await cashierReportService(where);

        /**
         * --------------------------------------------------------
         * FORMAT SALES FOR FRONTEND
         * --------------------------------------------------------
         *
         * We deliberately do NOT return:
         * - CardNumber
         * - StandTag
         * - serviceProvider
         * - serviceType
         * - commission
         */

        const formattedSales = (report.sales || []).map(
            (sale) => {

                const saleItems = (
                    sale.SaleItems || []
                ).map((item) => {

                    const product =
                        item.Product || {};

                    const variant =
                        item.ProductVariant || null;

                    return {
                        id: item.id,

                        productId:
                            item.ProductId,

                        productName:
                            product.name ||
                            item.productName ||
                            "Product",

                        variantId:
                            item.ProductVariantId ||
                            null,

                        variant: variant
                            ? {
                                id: variant.id,
                                size: variant.size || null,
                                color: variant.color || null,
                                sku: variant.sku || null,
                                barcode:
                                    variant.barcode ||
                                    null,
                            }
                            : null,

                        quantity:
                            Number(item.quantity || 0),

                        price:
                            Number(item.price || 0),

                        costPrice:
                            Number(item.costPrice || 0),

                        subtotal:
                            Number(item.subtotal || 0),
                    };
                });

                return {
                    id: sale.id,

                    receiptNumber:
                        sale.receiptNumber ||
                        `SALE-${sale.id}`,

                    localSaleId:
                        sale.localSaleId || null,

                    customer:
                        sale.Customer?.fullname ||
                        "Walk-in Customer",

                    customerId:
                        sale.CustomerId || null,

                    amount:
                        Number(
                            sale.totalAmount || 0
                        ),

                    subtotal:
                        Number(
                            sale.subtotal || 0
                        ),

                    discount:
                        Number(
                            sale.discount || 0
                        ),

                    pointsUsed:
                        Number(
                            sale.pointsUsed || 0
                        ),

                    paymentMethod:
                        sale.paymentMethod ||
                        "cash",

                    approvalStatus:
                        sale.approvalStatus,

                    status:
                        sale.status,

                    saleType:
                        sale.saleType || "product",

                    note:
                        sale.note || null,

                    cashier:
                        sale.RecordedBy?.fullname ||
                        "Unknown",

                    cashierId:
                        sale.RecordedById || null,

                    items: saleItems,

                    createdAt:
                        sale.createdAt,
                };
            }
        );

        return res.status(200).json({

            success: true,

            /**
             * Summary values
             */
            grossSales:
                Number(report.grossSales || 0),

            totalReturns:
                Number(report.totalReturns || 0),

            netSales:
                Number(report.netSales || 0),

            totalTransactions:
                Number(
                    report.totalTransactions || 0
                ),

            customersServed:
                Number(
                    report.customersServed || 0
                ),

            itemsSold:
                Number(
                    report.itemsSold || 0
                ),

            totalReturnedItems:
                Number(
                    report.totalReturnedItems || 0
                ),

            averageSale:
                Number(
                    report.averageSale || 0
                ),

            /**
             * Payment breakdown
             */
            cashSales:
                Number(report.cashSales || 0),

            transferSales:
                Number(
                    report.transferSales || 0
                ),

            posSales:
                Number(report.posSales || 0),

            mixedSales:
                Number(report.mixedSales || 0),

            /**
             * Fashion retail has no service sales.
             */
            totalServiceSales: 0,

            /**
             * Sales list
             */
            sales: formattedSales,
        });

    } catch (error) {

        console.error(
            "MY SALES REPORT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to generate cashier sales report",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};

/**
 * ============================================================
 * SINGLE SALE
 * ============================================================
 *
 * Used by:
 * - Receipt
 * - Sale details
 * - Return modal
 * - Sales history
 */

exports.getSingleSale = async (req, res) => {
    try {

        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "Sale ID is required",
            });
        }

        const sale = await Sale.findByPk(id, {

            include: [

                /**
                 * Customer
                 */
                {
                    model: Customer,
                    as: "Customer",
                    required: false,
                },

                /**
                 * Cashier
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

                /**
                 * Sale items
                 */
                {
                    model: SaleItem,
                    as: "SaleItems",
                    required: false,

                    include: [

                        /**
                         * Product
                         */
                        {
                            model: Product,
                            as: "Product",
                            required: false,
                        },

                        /**
                         * Product variant
                         */
                        {
                            model: ProductVariant,
                            as: "ProductVariant",
                            required: false,
                        },

                    ],
                },

            ],

        });

        if (!sale) {
            return res.status(404).json({
                success: false,
                message: "Sale not found",
            });
        }

        return res.status(200).json({
            success: true,
            sale,
        });

    } catch (error) {

        console.error(
            "GET SINGLE SALE ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch sale",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined,
        });
    }
};