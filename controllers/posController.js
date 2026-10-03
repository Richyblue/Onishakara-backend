const { Op } = require("sequelize");

const sequelize = require("../config/db");

const Sale = require("../models/Sale");
const SaleItem = require("../models/saleItem");
const Product = require("../models/Product");
const ProductVariant = require("../models/ProductVariant");
const Customer = require("../models/Customer");
const LoyaltyTransaction = require("../models/LoyaltyTransaction");
const StockMovement = require("../models/StockMovement");

// ============================================================
// HELPERS
// ============================================================

const roundMoney = (value) => {
  return Number(Number(value || 0).toFixed(2));
};

const getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const parseDateStart = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const parseDateEnd = (value) => {
  if (!value) return null;

  const date = new Date(`${value}T23:59:59.999`);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getErrorStatus = (error) => {
  if (error?.statusCode) return error.statusCode;

  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("not found") ||
    message.includes("does not exist")
  ) {
    return 404;
  }

  if (
    message.includes("stock") ||
    message.includes("already exists") ||
    message.includes("duplicate") ||
    message.includes("invalid") ||
    message.includes("required") ||
    message.includes("cannot") ||
    message.includes("must") ||
    message.includes("payment")
  ) {
    return 400;
  }

  return 500;
};

const createBusinessError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// ============================================================
// RECEIPT NUMBER
// ============================================================

const generateReceiptNumber = () => {
  const timestamp = Date.now();

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `ONI-${timestamp}-${random}`;
};

// ============================================================
// NORMALIZE ITEM
// ============================================================

const normalizeSaleItem = (item) => {
  const productId =
    item?.productId ??
    item?.ProductId;

  const variantId =
    item?.productVariantId ??
    item?.ProductVariantId ??
    item?.variantId ??
    item?.VariantId ??
    null;

  const quantity = Number(item?.quantity);

  if (!productId) {
    throw createBusinessError(
      "Every sale item must have a valid productId."
    );
  }

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw createBusinessError(
      `Invalid quantity for product ${productId}.`
    );
  }

  return {
    productId: Number(productId),
    variantId:
      variantId === null ||
      variantId === undefined ||
      variantId === ""
        ? null
        : Number(variantId),
    quantity,
  };
};

// ============================================================
// CREATE POS SALE
// ============================================================

exports.createPOSSale = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      customerId = null,
      items = [],
      discount = 0,
      paymentMethod = "cash",
      note = null,
      standTag = null,
      cardNumber = null,

      usePoints = false,
      redeemPoints = 0,

      localSaleId = null,
      queuedAt = null,
    } = req.body;

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (!Array.isArray(items) || items.length === 0) {
      throw createBusinessError(
        "At least one product is required."
      );
    }

    const allowedPaymentMethods = [
      "cash",
      "pos",
      "transfer",
      "mixed",
    ];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      throw createBusinessError(
        "Invalid payment method."
      );
    }

    const normalizedDiscount = Number(discount || 0);

    if (
      !Number.isFinite(normalizedDiscount) ||
      normalizedDiscount < 0
    ) {
      throw createBusinessError(
        "Invalid discount amount."
      );
    }

    // ========================================================
    // NORMALIZE ITEMS
    // ========================================================

    const normalizedItems = items.map(
      normalizeSaleItem
    );

    // ========================================================
    // OFFLINE DUPLICATE PROTECTION
    // ========================================================

    if (localSaleId) {
      const existingSale =
        await Sale.findOne({
          where: {
            localSaleId,
          },
          include: [
            {
              model: Customer,
              as: "Customer",
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
          transaction,
        });

      if (existingSale) {
        await transaction.commit();

        return res.status(200).json({
          success: true,
          duplicate: true,
          message:
            "This sale has already been synchronized.",
          sale: existingSale,
        });
      }
    }

    // ========================================================
    // CUSTOMER
    // ========================================================

    let customer = null;

    if (customerId) {
      customer = await Customer.findByPk(
        Number(customerId),
        {
          transaction,
          lock: transaction.LOCK.UPDATE,
        }
      );

      if (!customer) {
        throw createBusinessError(
          "Customer not found.",
          404
        );
      }
    }

    // ========================================================
    // LOYALTY POINT VALIDATION
    // ========================================================

    let requestedPoints = Number(
      redeemPoints || 0
    );

    if (!Number.isFinite(requestedPoints)) {
      requestedPoints = 0;
    }

    requestedPoints = Math.floor(
      requestedPoints
    );

    if (requestedPoints < 0) {
      throw createBusinessError(
        "Invalid loyalty points."
      );
    }

    if (requestedPoints > 0 && !customer) {
      throw createBusinessError(
        "A customer is required when redeeming loyalty points."
      );
    }

    if (!usePoints) {
      requestedPoints = 0;
    }

    if (
      requestedPoints > 0 &&
      Number(customer.loyaltyPoints || 0) <
        requestedPoints
    ) {
      throw createBusinessError(
        "Customer does not have enough loyalty points."
      );
    }

    // ========================================================
    // PREPARE SALE ITEMS
    // ========================================================

    let subtotal = 0;

    const preparedItems = [];

    for (const item of normalizedItems) {
      // ------------------------------------------------------
      // LOCK PRODUCT
      // ------------------------------------------------------

      const product =
        await Product.findByPk(
          item.productId,
          {
            transaction,
            lock: transaction.LOCK.UPDATE,
          }
        );

      if (!product) {
        throw createBusinessError(
          `Product ${item.productId} was not found.`,
          404
        );
      }

      if (product.status !== "active") {
        throw createBusinessError(
          `${product.name} is inactive and cannot be sold.`
        );
      }

      // ------------------------------------------------------
      // FIND ACTIVE VARIANTS
      // ------------------------------------------------------

      const activeVariantCount =
        await ProductVariant.count({
          where: {
            productId: product.id,
            status: "active",
          },
          transaction,
        });

      // ------------------------------------------------------
      // VARIANT SALE
      // ------------------------------------------------------

      let variant = null;

      if (item.variantId) {
        variant =
          await ProductVariant.findOne({
            where: {
              id: item.variantId,
              productId: product.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
          });

        if (!variant) {
          throw createBusinessError(
            `${product.name}: selected variant was not found.`,
            404
          );
        }

        if (variant.status !== "active") {
          throw createBusinessError(
            `${product.name}: selected variant is inactive.`
          );
        }

        if (
          Number(variant.quantity || 0) <
          item.quantity
        ) {
          throw createBusinessError(
            `${product.name}${
              variant.size
                ? ` - Size ${variant.size}`
                : ""
            }${
              variant.color
                ? ` - ${variant.color}`
                : ""
            }: only ${
              variant.quantity
            } item(s) available in stock.`
          );
        }
      }

      // ------------------------------------------------------
      // IF PRODUCT HAS ACTIVE VARIANTS,
      // A VARIANT MUST BE SELECTED
      // ------------------------------------------------------

      if (
        activeVariantCount > 0 &&
        !variant
      ) {
        throw createBusinessError(
          `${product.name} has product variants. Please select a size/color variant before selling.`
        );
      }

      // ------------------------------------------------------
      // DETERMINE PRICE
      // ------------------------------------------------------

      const sellingPrice = variant
        ? Number(
            variant.sellingPrice || 0
          )
        : Number(
            product.sellingPrice || 0
          );

      const costPrice = variant
        ? Number(
            variant.costPrice || 0
          )
        : Number(
            product.costPrice || 0
          );

      if (
        !Number.isFinite(sellingPrice) ||
        sellingPrice < 0
      ) {
        throw createBusinessError(
          `${product.name}: invalid selling price.`
        );
      }

      const lineSubtotal =
        roundMoney(
          sellingPrice *
            item.quantity
        );

      subtotal = roundMoney(
        subtotal + lineSubtotal
      );

      preparedItems.push({
        product,
        variant,
        productId: product.id,
        variantId:
          variant?.id || null,
        quantity: item.quantity,
        sellingPrice,
        costPrice,
        subtotal: lineSubtotal,
      });
    }

    // ========================================================
    // DISCOUNT VALIDATION
    // ========================================================

    if (
      normalizedDiscount >
      subtotal
    ) {
      throw createBusinessError(
        "Discount cannot be greater than the sale subtotal."
      );
    }

    // ========================================================
    // POINT REDEMPTION
    // 1 POINT = ₦1
    // ========================================================

    const pointsValue =
      Number(requestedPoints || 0);

    const amountAfterDiscount =
      roundMoney(
        subtotal -
          normalizedDiscount
      );

    if (
      pointsValue >
      amountAfterDiscount
    ) {
      throw createBusinessError(
        "Loyalty points cannot exceed the amount payable."
      );
    }

    const totalAmount =
      roundMoney(
        amountAfterDiscount -
          pointsValue
      );

    // ========================================================
    // RECEIPT
    // ========================================================

    let receiptNumber;

    // Try several times in the unlikely event of collision.
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate =
        generateReceiptNumber();

      const exists =
        await Sale.findOne({
          where: {
            receiptNumber: candidate,
          },
          transaction,
        });

      if (!exists) {
        receiptNumber = candidate;
        break;
      }
    }

    if (!receiptNumber) {
      throw createBusinessError(
        "Unable to generate a unique receipt number.",
        500
      );
    }

    // ========================================================
    // CREATE SALE
    // ========================================================

    const sale =
      await Sale.create(
        {
          localSaleId:
            localSaleId || null,

          totalAmount,

          saleType: "product",

          receiptNumber,

          approvalStatus:
            "approved",

          subtotal,

          discount:
            normalizedDiscount,

          paymentMethod,

          pointsUsed:
            requestedPoints,

          status: "completed",

          StandTag:
            standTag || null,

          CardNumber:
            cardNumber || null,

          note: note || null,

          CustomerId:
            customer?.id || null,

          RecordedById:
            req.user?.id || null,
        },
        {
          transaction,
        }
      );

    // ========================================================
    // PROCESS STOCK + SALE ITEMS
    // ========================================================

    for (const item of preparedItems) {
      const {
        product,
        variant,
        quantity,
        sellingPrice,
        costPrice,
        subtotal: lineSubtotal,
      } = item;

      // ------------------------------------------------------
      // VARIANT STOCK
      // ------------------------------------------------------

      if (variant) {
        const variantBefore =
          Number(
            variant.quantity || 0
          );

        const variantAfter =
          variantBefore -
          quantity;

        variant.quantity =
          variantAfter;

        await variant.save({
          transaction,
        });

        // ----------------------------------------------------
        // PARENT AGGREGATE STOCK
        // ----------------------------------------------------

        const productBefore =
          Number(
            product.quantity || 0
          );

        const productAfter =
          productBefore -
          quantity;

        if (productAfter < 0) {
          throw createBusinessError(
            `${product.name}: aggregate product stock is insufficient.`
          );
        }

        product.quantity =
          productAfter;

        await product.save({
          transaction,
        });

        // ----------------------------------------------------
        // VARIANT STOCK MOVEMENT
        // ----------------------------------------------------

        await StockMovement.create(
          {
            productId:
              product.id,

            variantId:
              variant.id,

            movementType:
              "sale",

            quantityBefore:
              variantBefore,

            quantityChange:
              -quantity,

            quantityAfter:
              variantAfter,

            referenceType:
              "sale",

            referenceId:
              sale.id,

            referenceNumber:
              sale.receiptNumber,

            reason:
              "POS sale",

            notes:
              "Product variant sold through POS.",

            recordedById:
              req.user?.id || null,
          },
          {
            transaction,
          }
        );

        // ----------------------------------------------------
        // PARENT AGGREGATE MOVEMENT
        //
        // This is a mirror of aggregate Product.quantity.
        // Reports must not add parent + variant movements
        // together when calculating physical stock movement.
        // ----------------------------------------------------

        await StockMovement.create(
          {
            productId:
              product.id,

            variantId:
              null,

            movementType:
              "sale",

            quantityBefore:
              productBefore,

            quantityChange:
              -quantity,

            quantityAfter:
              productAfter,

            referenceType:
              "sale",

            referenceId:
              sale.id,

            referenceNumber:
              sale.receiptNumber,

            reason:
              "POS sale - aggregate stock",

            notes:
              "Aggregate parent stock mirror for variant sale.",

            recordedById:
              req.user?.id || null,
          },
          {
            transaction,
          }
        );
      }

      // ------------------------------------------------------
      // NORMAL PRODUCT STOCK
      // ------------------------------------------------------

      else {
        const productBefore =
          Number(
            product.quantity || 0
          );

        if (
          productBefore <
          quantity
        ) {
          throw createBusinessError(
            `${product.name}: only ${productBefore} item(s) available in stock.`
          );
        }

        const productAfter =
          productBefore -
          quantity;

        product.quantity =
          productAfter;

        await product.save({
          transaction,
        });

        await StockMovement.create(
          {
            productId:
              product.id,

            variantId:
              null,

            movementType:
              "sale",

            quantityBefore:
              productBefore,

            quantityChange:
              -quantity,

            quantityAfter:
              productAfter,

            referenceType:
              "sale",

            referenceId:
              sale.id,

            referenceNumber:
              sale.receiptNumber,

            reason:
              "POS sale",

            notes:
              "Product sold through POS.",

            recordedById:
              req.user?.id || null,
          },
          {
            transaction,
          }
        );
      }

      // ------------------------------------------------------
      // SALE ITEM
      // ------------------------------------------------------

      await SaleItem.create(
        {
          SaleId:
            sale.id,

          ProductId:
            product.id,

          ProductVariantId:
            variant?.id || null,

          itemType:
            "product",

          quantity,

          price:
            sellingPrice,

          costPrice,

          subtotal:
            lineSubtotal,
        },
        {
          transaction,
        }
      );
    }

    // ========================================================
    // LOYALTY REDEMPTION
    // ========================================================

    if (
      customer &&
      requestedPoints > 0
    ) {
      const previousPoints =
        Number(
          customer.loyaltyPoints || 0
        );

      const remainingPoints =
        previousPoints -
        requestedPoints;

      customer.loyaltyPoints =
        remainingPoints;

      await customer.save({
        transaction,
      });

      await LoyaltyTransaction.create(
        {
          CustomerId:
            customer.id,

          points:
            -requestedPoints,

          type:
            "redeemed",

          referenceType:
            "sale",

          referenceId:
            sale.id,

          description:
            `Redeemed ${requestedPoints} loyalty point(s) on receipt ${sale.receiptNumber}.`,
        },
        {
          transaction,
        }
      );
    }

    // ========================================================
    // LOYALTY EARNING
    //
    // 1 POINT PER ₦1,000 SPENT
    // ========================================================

    if (customer) {
      const earnedPoints =
        Math.floor(
          totalAmount / 1000
        );

      if (earnedPoints > 0) {
        const currentPoints =
          Number(
            customer.loyaltyPoints || 0
          );

        customer.loyaltyPoints =
          currentPoints +
          earnedPoints;

        await customer.save({
          transaction,
        });

        await LoyaltyTransaction.create(
          {
            CustomerId:
              customer.id,

            points:
              earnedPoints,

            type:
              "earned",

            referenceType:
              "sale",

            referenceId:
              sale.id,

            description:
              `Earned ${earnedPoints} loyalty point(s) from receipt ${sale.receiptNumber}.`,
          },
          {
            transaction,
          }
        );
      }
    }

    // ========================================================
    // COMMIT
    // ========================================================

    await transaction.commit();

    // ========================================================
    // RETURN COMPLETE SALE
    // ========================================================

    const completedSale =
      await Sale.findByPk(
        sale.id,
        {
          include: [
            {
              model: Customer,
              as: "Customer",
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
        }
      );

    return res.status(201).json({
      success: true,

      message:
        "Sale completed successfully.",

      sale: completedSale,

      queuedAt:
        queuedAt || null,
    });
  } catch (error) {
    // ========================================================
    // ROLLBACK
    // ========================================================

    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error(
        "SALE ROLLBACK ERROR:",
        rollbackError
      );
    }

    console.error(
      "CREATE POS SALE ERROR:",
      error
    );

    // ========================================================
    // DUPLICATE LOCAL SALE
    // ========================================================

    if (
      error?.name ===
        "SequelizeUniqueConstraintError" &&
      req.body?.localSaleId
    ) {
      const existingSale =
        await Sale.findOne({
          where: {
            localSaleId:
              req.body.localSaleId,
          },
        });

      if (existingSale) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message:
            "Sale already exists.",
          sale: existingSale,
        });
      }
    }

    const status =
      getErrorStatus(error);

    return res.status(status).json({
      success: false,
      message:
        error?.message ||
        "Failed to complete sale.",
    });
  }
};

// ============================================================
// GET SALES
// ============================================================

exports.getSales = async (
  req,
  res
) => {
  try {
    const {
      search,
      paymentMethod,
      status,
      approvalStatus,
      customerId,
      cashierId,
      startDate,
      endDate,

      page = 1,
      limit = 50,
    } = req.query;

    const where = {};

    // --------------------------------------------------------
    // PAYMENT
    // --------------------------------------------------------

    if (paymentMethod) {
      where.paymentMethod =
        paymentMethod;
    }

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    if (status) {
      where.status = status;
    }

    // --------------------------------------------------------
    // APPROVAL
    // --------------------------------------------------------

    if (approvalStatus) {
      where.approvalStatus =
        approvalStatus;
    }

    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    if (customerId) {
      where.CustomerId =
        Number(customerId);
    }

    // --------------------------------------------------------
    // CASHIER
    // --------------------------------------------------------

    if (cashierId) {
      where.RecordedById =
        Number(cashierId);
    }

    // --------------------------------------------------------
    // DATE RANGE
    // --------------------------------------------------------

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const start =
          parseDateStart(
            startDate
          );

        if (!start) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate.",
          });
        }

        where.createdAt[
          Op.gte
        ] = start;
      }

      if (endDate) {
        const end =
          parseDateEnd(
            endDate
          );

        if (!end) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate.",
          });
        }

        where.createdAt[
          Op.lte
        ] = end;
      }
    }

    // --------------------------------------------------------
    // SEARCH
    // --------------------------------------------------------

    if (search) {
      const searchTerm =
        String(search).trim();

      if (searchTerm) {
        where[Op.or] = [
          {
            receiptNumber: {
              [Op.like]:
                `%${searchTerm}%`,
            },
          },
          {
            localSaleId: {
              [Op.like]:
                `%${searchTerm}%`,
            },
          },
          {
            StandTag: {
              [Op.like]:
                `%${searchTerm}%`,
            },
          },
          {
            CardNumber: {
              [Op.like]:
                `%${searchTerm}%`,
            },
          },
        ];
      }
    }

    const pageNumber =
      Math.max(
        Number(page) || 1,
        1
      );

    const pageSize =
      Math.min(
        Math.max(
          Number(limit) || 50,
          1
        ),
        200
      );

    const offset =
      (pageNumber - 1) *
      pageSize;

    const result =
      await Sale.findAndCountAll({
        where,

        include: [
          {
            model: Customer,
            as: "Customer",
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
          [
            "createdAt",
            "DESC",
          ],
        ],

        limit: pageSize,

        offset,
      });

    return res.status(200).json({
      success: true,

      sales:
        result.rows,

      pagination: {
        page:
          pageNumber,

        limit:
          pageSize,

        total:
          result.count,

        totalPages:
          Math.ceil(
            result.count /
              pageSize
          ),
      },
    });
  } catch (error) {
    console.error(
      "GET SALES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch sales.",
    });
  }
};

// ============================================================
// GET SINGLE SALE
// ============================================================

exports.getSale = async (
  req,
  res
) => {
  try {
    const sale =
      await Sale.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Customer,
              as: "Customer",
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
        }
      );

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale not found.",
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error(
      "GET SALE ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch sale.",
    });
  }
};

// ============================================================
// GET SALE BY RECEIPT
// ============================================================

exports.getSaleByReceipt = async (
  req,
  res
) => {
  try {
    const sale =
      await Sale.findOne({
        where: {
          receiptNumber:
            req.params.receiptNumber,
        },

        include: [
          {
            model: Customer,
            as: "Customer",
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
      });

    if (!sale) {
      return res.status(404).json({
        success: false,
        message:
          "Sale receipt not found.",
      });
    }

    return res.status(200).json({
      success: true,
      sale,
    });
  } catch (error) {
    console.error(
      "GET SALE BY RECEIPT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch receipt.",
    });
  }
};

// ============================================================
// SEARCH SALES / RECEIPTS
// ============================================================

exports.searchSales = async (
  req,
  res
) => {
  try {
    const search =
      String(
        req.query.search || ""
      ).trim();

    if (!search) {
      return res.status(200).json({
        success: true,
        sales: [],
      });
    }

    const sales =
      await Sale.findAll({
        where: {
          [Op.or]: [
            {
              receiptNumber: {
                [Op.like]:
                  `%${search}%`,
              },
            },
            {
              localSaleId: {
                [Op.like]:
                  `%${search}%`,
              },
            },
            {
              StandTag: {
                [Op.like]:
                  `%${search}%`,
              },
            },
            {
              CardNumber: {
                [Op.like]:
                  `%${search}%`,
              },
            },
          ],
        },

        include: [
          {
            model: Customer,
            as: "Customer",
            required: false,
          },
        ],

        order: [
          [
            "createdAt",
            "DESC",
          ],
        ],

        limit: 50,
      });

    return res.status(200).json({
      success: true,
      sales,
    });
  } catch (error) {
    console.error(
      "SEARCH SALES ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to search sales.",
    });
  }
};

// ============================================================
// TODAY SALES SUMMARY
// ============================================================

exports.getTodaySalesSummary = async (
  req,
  res
) => {
  try {
    const start =
      getStartOfDay();

    const end =
      getEndOfDay();

    const sales =
      await Sale.findAll({
        where: {
          createdAt: {
            [Op.between]: [
              start,
              end,
            ],
          },

          status: "completed",

          approvalStatus:
            "approved",
        },

        attributes: [
          "id",
          "totalAmount",
          "paymentMethod",
        ],
      });

    let totalSales = 0;

    let cashSales = 0;

    let posSales = 0;

    let transferSales = 0;

    let mixedSales = 0;

    for (const sale of sales) {
      const amount =
        Number(
          sale.totalAmount || 0
        );

      totalSales =
        roundMoney(
          totalSales + amount
        );

      if (
        sale.paymentMethod ===
        "cash"
      ) {
        cashSales =
          roundMoney(
            cashSales + amount
          );
      }

      if (
        sale.paymentMethod ===
        "pos"
      ) {
        posSales =
          roundMoney(
            posSales + amount
          );
      }

      if (
        sale.paymentMethod ===
        "transfer"
      ) {
        transferSales =
          roundMoney(
            transferSales +
              amount
          );
      }

      if (
        sale.paymentMethod ===
        "mixed"
      ) {
        mixedSales =
          roundMoney(
            mixedSales + amount
          );
      }
    }

    return res.status(200).json({
      success: true,

      summary: {
        totalSales,

        totalTransactions:
          sales.length,

        cashSales,

        posSales,

        transferSales,

        mixedSales,
      },
    });
  } catch (error) {
    console.error(
      "TODAY SALES SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate today's sales summary.",
    });
  }
};

// ============================================================
// GENERAL SALES SUMMARY
// ============================================================

exports.getSalesSummary = async (
  req,
  res
) => {
  try {
    const {
      startDate,
      endDate,
    } = req.query;

    const where = {
      status: "completed",
      approvalStatus:
        "approved",
    };

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const start =
          parseDateStart(
            startDate
          );

        if (!start) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate.",
          });
        }

        where.createdAt[
          Op.gte
        ] = start;
      }

      if (endDate) {
        const end =
          parseDateEnd(
            endDate
          );

        if (!end) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate.",
          });
        }

        where.createdAt[
          Op.lte
        ] = end;
      }
    }

    const sales =
      await Sale.findAll({
        where,
        attributes: [
          "id",
          "totalAmount",
          "paymentMethod",
        ],
      });

    let totalSales = 0;

    let cashSales = 0;

    let posSales = 0;

    let transferSales = 0;

    let mixedSales = 0;

    for (const sale of sales) {
      const amount =
        Number(
          sale.totalAmount || 0
        );

      totalSales =
        roundMoney(
          totalSales + amount
        );

      switch (
        sale.paymentMethod
      ) {
        case "cash":
          cashSales =
            roundMoney(
              cashSales +
                amount
            );
          break;

        case "pos":
          posSales =
            roundMoney(
              posSales +
                amount
            );
          break;

        case "transfer":
          transferSales =
            roundMoney(
              transferSales +
                amount
            );
          break;

        case "mixed":
          mixedSales =
            roundMoney(
              mixedSales +
                amount
            );
          break;

        default:
          break;
      }
    }

    return res.status(200).json({
      success: true,

      summary: {
        totalSales,

        totalTransactions:
          sales.length,

        cashSales,

        posSales,

        transferSales,

        mixedSales,
      },
    });
  } catch (error) {
    console.error(
      "SALES SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate sales summary.",
    });
  }
};

// ============================================================
// CASHIER SALES SUMMARY
// ============================================================

exports.getCashierSalesSummary = async (
  req,
  res
) => {
  try {
    const {
      cashierId,
      startDate,
      endDate,
    } = req.query;

    const where = {
      status: "completed",

      approvalStatus:
        "approved",
    };

    if (cashierId) {
      where.RecordedById =
        Number(cashierId);
    }

    if (startDate || endDate) {
      where.createdAt = {};

      if (startDate) {
        const start =
          parseDateStart(
            startDate
          );

        if (!start) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate.",
          });
        }

        where.createdAt[
          Op.gte
        ] = start;
      }

      if (endDate) {
        const end =
          parseDateEnd(
            endDate
          );

        if (!end) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate.",
          });
        }

        where.createdAt[
          Op.lte
        ] = end;
      }
    }

    const sales =
      await Sale.findAll({
        where,

        attributes: [
          "id",
          "RecordedById",
          "totalAmount",
          "paymentMethod",
          "receiptNumber",
          "createdAt",
        ],

        order: [
          [
            "createdAt",
            "DESC",
          ],
        ],
      });

    const totalSales =
      roundMoney(
        sales.reduce(
          (sum, sale) =>
            sum +
            Number(
              sale.totalAmount ||
                0
            ),
          0
        )
      );

    const transactionCount =
      sales.length;

    return res.status(200).json({
      success: true,

      summary: {
        totalSales,

        transactionCount,

        averageSale:
          transactionCount
            ? roundMoney(
                totalSales /
                  transactionCount
              )
            : 0,
      },

      sales,
    });
  } catch (error) {
    console.error(
      "CASHIER SALES SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate cashier sales summary.",
    });
  }
};

// ============================================================
// PRODUCT SALES SUMMARY
// ============================================================

exports.getProductSalesSummary = async (
  req,
  res
) => {
  try {
    const {
      startDate,
      endDate,
      productId,
      variantId,
    } = req.query;

    const saleWhere = {
      status: "completed",

      approvalStatus:
        "approved",
    };

    if (startDate || endDate) {
      saleWhere.createdAt = {};

      if (startDate) {
        const start =
          parseDateStart(
            startDate
          );

        if (!start) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid startDate.",
          });
        }

        saleWhere.createdAt[
          Op.gte
        ] = start;
      }

      if (endDate) {
        const end =
          parseDateEnd(
            endDate
          );

        if (!end) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid endDate.",
          });
        }

        saleWhere.createdAt[
          Op.lte
        ] = end;
      }
    }

    const saleItemWhere = {};

    if (productId) {
      saleItemWhere.ProductId =
        Number(productId);
    }

    if (variantId) {
      saleItemWhere.ProductVariantId =
        Number(variantId);
    }

    const saleItems =
      await SaleItem.findAll({
        where:
          Object.keys(
            saleItemWhere
          ).length
            ? saleItemWhere
            : undefined,

        include: [
          {
            model: Sale,
            as: "Sale",
            required: true,
            where: saleWhere,
          },
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
      });

    const grouped =
      new Map();

    for (const item of saleItems) {
      const product =
        item.Product;

      const variant =
        item.ProductVariant;

      const key = variant
        ? `variant-${variant.id}`
        : `product-${item.ProductId}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          productId:
            item.ProductId,

          variantId:
            item.ProductVariantId ||
            null,

          productName:
            product?.name ||
            "Unknown Product",

          variantName: variant
            ? [
                variant.size,
                variant.color,
              ]
                .filter(Boolean)
                .join(" / ")
            : null,

          quantitySold: 0,

          salesAmount: 0,
        });
      }

      const row =
        grouped.get(key);

      row.quantitySold +=
        Number(
          item.quantity || 0
        );

      row.salesAmount =
        roundMoney(
          row.salesAmount +
            Number(
              item.subtotal || 0
            )
        );
    }

    const results =
      Array.from(
        grouped.values()
      ).sort(
        (a, b) =>
          b.salesAmount -
          a.salesAmount
      );

    return res.status(200).json({
      success: true,
      products: results,
    });
  } catch (error) {
    console.error(
      "PRODUCT SALES SUMMARY ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to generate product sales summary.",
    });
  }
};