const { Op } = require("sequelize");
const sequelize = require("../config/db");

const {
  Product,
  ProductVariant,
  Purchase,
  PurchaseItem,
  Supplier,
  StockMovement,
  User,
} = require("../models");

/*
|--------------------------------------------------------------------------
| GENERATE PURCHASE NUMBER
|--------------------------------------------------------------------------
*/

const generatePurchaseNumber = async (transaction) => {
  const prefix = "PUR";
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const datePrefix = `${prefix}-${year}${month}${day}`;

  const existing = await Purchase.count({
    where: {
      purchaseNumber: {
        [Op.like]: `${datePrefix}-%`,
      },
    },
    transaction,
  });

  return `${datePrefix}-${String(existing + 1).padStart(4, "0")}`;
};


/*
|--------------------------------------------------------------------------
| PAYMENT STATUS
|--------------------------------------------------------------------------
*/

const calculatePaymentStatus = (total, paid) => {
  const totalAmount = Number(total || 0);
  const amountPaid = Number(paid || 0);

  if (amountPaid <= 0) {
    return "unpaid";
  }

  if (amountPaid >= totalAmount) {
    return "paid";
  }

  return "partial";
};


/*
|--------------------------------------------------------------------------
| NORMALIZE PURCHASE ITEMS
|--------------------------------------------------------------------------
*/

const normalizeItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => ({
      productId: Number(
        item.productId ||
          item.ProductId ||
          item.product?.id ||
          item.Product?.id ||
          0
      ),

      variantId: item.variantId
        ? Number(item.variantId)
        : item.VariantId
          ? Number(item.VariantId)
          : null,

      productName:
        item.productName ||
        item.name ||
        item.product?.name ||
        item.Product?.name ||
        null,

      variantName:
        item.variantName ||
        item.variant?.name ||
        item.Variant?.name ||
        null,

      quantity: Number(item.quantity || 0),

      costPrice: Number(
        item.costPrice ||
          item.purchasePrice ||
          item.price ||
          0
      ),

      discount: Number(item.discount || 0),
    }))
    .filter(
      (item) =>
        item.productId > 0 &&
        item.quantity > 0 &&
        item.costPrice >= 0
    );
};


/*
|--------------------------------------------------------------------------
| CALCULATE PURCHASE TOTALS
|--------------------------------------------------------------------------
*/

const calculateTotals = (items, data) => {
  const subtotal = items.reduce(
    (sum, item) =>
      sum + item.quantity * item.costPrice,
    0
  );

  const discount = Math.max(
    0,
    Number(data.discount || 0)
  );

  const tax = Math.max(
    0,
    Number(data.tax || 0)
  );

  const shippingCost = Math.max(
    0,
    Number(data.shippingCost || 0)
  );

  const otherCharges = Math.max(
    0,
    Number(data.otherCharges || 0)
  );

  const totalAmount = Math.max(
    0,
    subtotal -
      discount +
      tax +
      shippingCost +
      otherCharges
  );

  const amountPaid = Math.max(
    0,
    Number(data.amountPaid || 0)
  );

  const balanceDue = Math.max(
    0,
    totalAmount - amountPaid
  );

  return {
    subtotal,
    discount,
    tax,
    shippingCost,
    otherCharges,
    totalAmount,
    amountPaid,
    balanceDue,

    paymentStatus:
      calculatePaymentStatus(
        totalAmount,
        amountPaid
      ),
  };
};


/*
|--------------------------------------------------------------------------
| GET RECORDED BY USER
|--------------------------------------------------------------------------
*/

const getRecordedById = (req, fallback = null) => {
  return (
    req.user?.id ||
    req.body?.recordedById ||
    fallback ||
    null
  );
};


/*
|--------------------------------------------------------------------------
| CREATE STOCK MOVEMENT
|--------------------------------------------------------------------------
|
| Central helper so every purchase stock operation creates
| a consistent StockMovement record.
|
*/

const createStockMovement = async ({
  transaction,
  productId,
  variantId = null,
  movementType,
  quantityBefore,
  quantityChange,
  quantityAfter,
  purchase,
  reason,
  notes = null,
  recordedById = null,
}) => {
  return StockMovement.create(
    {
      productId,
      variantId,

      movementType,

      quantityBefore,
      quantityChange,
      quantityAfter,

      referenceType: "purchase",

      referenceId: purchase.id,

      referenceNumber:
        purchase.purchaseNumber,

      reason,

      notes,

      recordedById,
    },
    {
      transaction,
    }
  );
};


/*
|--------------------------------------------------------------------------
| RECEIVE PURCHASE ITEM
|--------------------------------------------------------------------------
|
| Adds stock and creates the corresponding stock movement.
|
*/

const receivePurchaseItem = async ({
  transaction,
  purchase,
  item,
  recordedById,
}) => {
  const product = await Product.findByPk(
    item.productId,
    {
      transaction,
      lock: transaction.LOCK.UPDATE,
    }
  );

  if (!product) {
    throw new Error(
      `Product "${item.productName || item.productId}" was not found.`
    );
  }

  let variant = null;

  if (item.variantId) {
    variant = await ProductVariant.findOne({
      where: {
        id: item.variantId,
        productId: product.id,
      },

      transaction,

      lock: transaction.LOCK.UPDATE,
    });

    if (!variant) {
      throw new Error(
        `Product variant for "${product.name}" was not found.`
      );
    }
  }

  const quantityChange =
    Number(item.quantity || 0);

  /*
   * ------------------------------------------------------
   * VARIANT STOCK
   * ------------------------------------------------------
   */

  if (variant) {
    const variantQuantityBefore =
      Number(variant.quantity || 0);

    const variantQuantityAfter =
      variantQuantityBefore +
      quantityChange;

    await variant.update(
      {
        quantity: variantQuantityAfter,
        costPrice: item.costPrice,
      },
      {
        transaction,
      }
    );

    await createStockMovement({
      transaction,

      productId: product.id,

      variantId: variant.id,

      movementType: "purchase",

      quantityBefore:
        variantQuantityBefore,

      quantityChange,

      quantityAfter:
        variantQuantityAfter,

      purchase,

      reason:
        "Stock received from purchase",

      notes:
        purchase.notes || null,

      recordedById,
    });
  }


  /*
   * ------------------------------------------------------
   * PARENT PRODUCT STOCK
   * ------------------------------------------------------
   *
   * Product.quantity represents the total quantity
   * available for the product.
   *
   * Therefore variant purchases also increase the
   * parent product quantity.
   */

  const productQuantityBefore =
    Number(product.quantity || 0);

  const productQuantityAfter =
    productQuantityBefore +
    quantityChange;

  await product.update(
    {
      quantity: productQuantityAfter,

      costPrice: item.costPrice,
    },
    {
      transaction,
    }
  );

  await createStockMovement({
    transaction,

    productId: product.id,

    variantId: null,

    movementType: "purchase",

    quantityBefore:
      productQuantityBefore,

    quantityChange,

    quantityAfter:
      productQuantityAfter,

    purchase,

    reason:
      variant
        ? "Variant stock received from purchase"
        : "Stock received from purchase",

    notes:
      purchase.notes || null,

    recordedById,
  });

  return {
    product,
    variant,
  };
};


/*
|--------------------------------------------------------------------------
| REVERSE PURCHASE ITEM STOCK
|--------------------------------------------------------------------------
|
| Used when a received purchase is cancelled.
|
*/

const reversePurchaseItemStock = async ({
  transaction,
  purchase,
  item,
  recordedById,
}) => {
  const product = await Product.findByPk(
    item.productId,
    {
      transaction,

      lock: transaction.LOCK.UPDATE,
    }
  );

  if (!product) {
    throw new Error(
      `Product "${item.productName || item.productId}" was not found while reversing stock.`
    );
  }

  const quantityToRemove =
    Number(item.quantity || 0);


  /*
   * ------------------------------------------------------
   * VARIANT
   * ------------------------------------------------------
   */

  if (item.variantId) {
    const variant =
      await ProductVariant.findOne({
        where: {
          id: item.variantId,

          productId: product.id,
        },

        transaction,

        lock: transaction.LOCK.UPDATE,
      });

    if (!variant) {
      throw new Error(
        `Variant for "${product.name}" was not found while reversing stock.`
      );
    }

    const variantQuantityBefore =
      Number(variant.quantity || 0);

    const variantQuantityAfter =
      variantQuantityBefore -
      quantityToRemove;

    if (variantQuantityAfter < 0) {
      throw new Error(
        `Cannot cancel purchase "${purchase.purchaseNumber}" because variant stock for "${product.name}" would become negative. Current variant stock: ${variantQuantityBefore}, required reversal: ${quantityToRemove}.`
      );
    }

    await variant.update(
      {
        quantity: variantQuantityAfter,
      },
      {
        transaction,
      }
    );

    await createStockMovement({
      transaction,

      productId: product.id,

      variantId: variant.id,

      movementType: "purchase",

      quantityBefore:
        variantQuantityBefore,

      quantityChange:
        -quantityToRemove,

      quantityAfter:
        variantQuantityAfter,

      purchase,

      reason:
        "Stock reversed because purchase was cancelled",

      notes:
        purchase.notes || null,

      recordedById,
    });
  }


  /*
   * ------------------------------------------------------
   * PARENT PRODUCT
   * ------------------------------------------------------
   */

  const productQuantityBefore =
    Number(product.quantity || 0);

  const productQuantityAfter =
    productQuantityBefore -
    quantityToRemove;

  if (productQuantityAfter < 0) {
    throw new Error(
      `Cannot cancel purchase "${purchase.purchaseNumber}" because stock for "${product.name}" would become negative. Current stock: ${productQuantityBefore}, required reversal: ${quantityToRemove}.`
    );
  }

  await product.update(
    {
      quantity: productQuantityAfter,
    },
    {
      transaction,
    }
  );

  await createStockMovement({
    transaction,

    productId: product.id,

    variantId: null,

    movementType: "purchase",

    quantityBefore:
      productQuantityBefore,

    quantityChange:
      -quantityToRemove,

    quantityAfter:
      productQuantityAfter,

    purchase,

    reason:
      "Stock reversed because purchase was cancelled",

    notes:
      purchase.notes || null,

    recordedById,
  });
};


/*
|--------------------------------------------------------------------------
| CREATE PURCHASE
|--------------------------------------------------------------------------
*/

const createPurchase = async (req, res) => {
  const transaction =
    await sequelize.transaction();

  try {
    const {
      supplierId,
      purchaseDate,
      discount,
      tax,
      shippingCost,
      otherCharges,
      amountPaid,
      paymentMethod,
      notes,
      invoiceNumber,
      recordedById,
      status = "received",
    } = req.body;


    /*
     * Supplier
     */

    if (!supplierId) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message: "Supplier is required.",
      });
    }

    const supplier =
      await Supplier.findByPk(
        supplierId,
        {
          transaction,

          lock: transaction.LOCK.UPDATE,
        }
      );

    if (!supplier) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }


    /*
     * Items
     */

    const items = normalizeItems(
      req.body.items
    );

    if (!items.length) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "At least one valid product is required.",
      });
    }


    /*
     * Totals
     */

    const totals =
      calculateTotals(items, {
        discount,
        tax,
        shippingCost,
        otherCharges,
        amountPaid,
      });


    if (
      totals.amountPaid >
      totals.totalAmount
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,
        message:
          "Amount paid cannot be greater than the purchase total.",
      });
    }


    /*
     * Purchase number
     */

    const purchaseNumber =
      await generatePurchaseNumber(
        transaction
      );


    /*
     * Recorded user
     */

    const finalRecordedById =
      getRecordedById(
        req,
        recordedById
      );


    /*
     * Validate recorded user if provided.
     */

    if (finalRecordedById) {
      const user =
        await User.findByPk(
          finalRecordedById,
          {
            transaction,
          }
        );

      if (!user) {
        throw new Error(
          "The recorded-by user was not found."
        );
      }
    }


    /*
     * Create purchase
     */

    const purchase =
      await Purchase.create(
        {
          purchaseNumber,

          supplierId,

          purchaseDate:
            purchaseDate ||
            new Date(),

          ...totals,

          paymentMethod:
            paymentMethod ||
            "cash",

          notes:
            notes?.trim() ||
            null,

          invoiceNumber:
            invoiceNumber?.trim() ||
            null,

          recordedById:
            finalRecordedById,

          status:
            status === "draft"
              ? "draft"
              : "received",
        },

        {
          transaction,
        }
      );


    /*
     * Create purchase items
     */

    for (const item of items) {
      const product =
        await Product.findByPk(
          item.productId,
          {
            transaction,

            lock: transaction.LOCK.UPDATE,
          }
        );

      if (!product) {
        throw new Error(
          `Product "${item.productName || item.productId}" was not found.`
        );
      }


      let variant = null;

      if (item.variantId) {
        variant =
          await ProductVariant.findOne({
            where: {
              id: item.variantId,

              productId:
                product.id,
            },

            transaction,

            lock: transaction.LOCK.UPDATE,
          });

        if (!variant) {
          throw new Error(
            `Product variant for "${product.name}" was not found.`
          );
        }
      }


      const itemSubtotal =
        item.quantity *
        item.costPrice;

      const itemDiscount =
        Math.max(
          0,
          Number(item.discount || 0)
        );

      const itemTotal =
        Math.max(
          0,
          itemSubtotal -
            itemDiscount
        );


      await PurchaseItem.create(
        {
          purchaseId:
            purchase.id,

          productId:
            product.id,

          variantId:
            variant?.id ||
            null,

          productName:
            product.name,

          variantName:
            item.variantName ||
            (
              variant
                ? [
                    variant.size,
                    variant.color,
                  ]
                    .filter(Boolean)
                    .join(" / ")
                : null
            ),

          quantity:
            item.quantity,

          costPrice:
            item.costPrice,

          subtotal:
            itemSubtotal,

          discount:
            itemDiscount,

          total:
            itemTotal,
        },

        {
          transaction,
        }
      );


      /*
       * Only received purchases affect stock.
       */

      if (
        purchase.status ===
        "received"
      ) {
        await receivePurchaseItem({
          transaction,

          purchase,

          item,

          recordedById:
            finalRecordedById,
        });
      }
    }


    /*
     * Commit
     */

    await transaction.commit();


    /*
     * Return complete purchase
     */

    const createdPurchase =
      await Purchase.findByPk(
        purchase.id,
        {
          include: [
            {
              model: Supplier,
              as: "Supplier",
            },

            {
              model: PurchaseItem,
              as: "Items",

              include: [
                {
                  model: Product,
                  as: "Product",
                  paranoid: false,
                },

                {
                  model: ProductVariant,
                  as: "Variant",
                },
              ],
            },

            {
              model: User,
              as: "RecordedBy",
              required: false,

              attributes: [
                "id",
                "name",
                "email",
              ],
            },
          ],
        }
      );


    return res.status(201).json({
      success: true,

      message:
        purchase.status ===
        "received"
          ? "Purchase created and stock received successfully."
          : "Purchase draft created successfully.",

      purchase:
        createdPurchase,
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Create purchase error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to create purchase.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET ALL PURCHASES
|--------------------------------------------------------------------------
*/

const getPurchases = async (req, res) => {
  try {
    const {
      search = "",
      supplierId,
      status,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 20,
    } = req.query;


    const pageNumber = Math.max(
      1,
      Number(page)
    );

    const limitNumber = Math.min(
      100,
      Math.max(1, Number(limit))
    );

    const offset =
      (pageNumber - 1) *
      limitNumber;

    const where = {};


    if (search.trim()) {
      where[Op.or] = [
        {
          purchaseNumber: {
            [Op.like]:
              `%${search.trim()}%`,
          },
        },

        {
          invoiceNumber: {
            [Op.like]:
              `%${search.trim()}%`,
          },
        },
      ];
    }


    if (supplierId) {
      where.supplierId =
        supplierId;
    }


    if (status) {
      where.status =
        status;
    }


    if (paymentStatus) {
      where.paymentStatus =
        paymentStatus;
    }


    if (startDate || endDate) {
      where.purchaseDate = {};

      if (startDate) {
        where.purchaseDate[
          Op.gte
        ] = new Date(
          `${startDate}T00:00:00`
        );
      }

      if (endDate) {
        where.purchaseDate[
          Op.lte
        ] = new Date(
          `${endDate}T23:59:59`
        );
      }
    }


    const result =
      await Purchase.findAndCountAll({
        where,

        include: [
          {
            model: Supplier,
            as: "Supplier",

            attributes: [
              "id",
              "name",
              "companyName",
              "phone",
            ],
          },
        ],

        order: [
          [
            "purchaseDate",
            "DESC",
          ],

          [
            "id",
            "DESC",
          ],
        ],

        limit:
          limitNumber,

        offset,

        distinct: true,
      });


    return res.json({
      success: true,

      purchases:
        result.rows,

      pagination: {
        total:
          result.count,

        page:
          pageNumber,

        limit:
          limitNumber,

        totalPages:
          Math.ceil(
            result.count /
              limitNumber
          ),
      },
    });
  } catch (error) {
    console.error(
      "Get purchases error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to fetch purchases.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| GET SINGLE PURCHASE
|--------------------------------------------------------------------------
*/

const getPurchase = async (
  req,
  res
) => {
  try {
    const purchase =
      await Purchase.findByPk(
        req.params.id,
        {
          include: [
            {
              model: Supplier,
              as: "Supplier",
            },

            {
              model: PurchaseItem,
              as: "Items",

              include: [
                {
                  model: Product,
                  as: "Product",

                  paranoid: false,
                },

                {
                  model: ProductVariant,
                  as: "Variant",
                },
              ],
            },

            {
              model: User,
              as: "RecordedBy",

              required: false,

              attributes: [
                "id",
                "name",
                "email",
              ],
            },
          ],
        }
      );


    if (!purchase) {
      return res.status(404).json({
        success: false,

        message:
          "Purchase not found.",
      });
    }


    return res.json({
      success: true,

      purchase,
    });
  } catch (error) {
    console.error(
      "Get purchase error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to fetch purchase.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| UPDATE PURCHASE
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Only drafts can be edited.
|
*/

const updatePurchase = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const purchase =
      await Purchase.findByPk(
        req.params.id,
        {
          transaction,

          lock:
            transaction.LOCK.UPDATE,
        }
      );


    if (!purchase) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message:
          "Purchase not found.",
      });
    }


    if (
      purchase.status !==
      "draft"
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message:
          "Only draft purchases can be edited. A received purchase cannot be edited because its stock has already been updated.",
      });
    }


    const {
      supplierId,
      purchaseDate,
      discount,
      tax,
      shippingCost,
      otherCharges,
      amountPaid,
      paymentMethod,
      notes,
      invoiceNumber,
      items: rawItems,
    } = req.body;


    /*
     * Supplier validation
     */

    if (supplierId) {
      const supplier =
        await Supplier.findByPk(
          supplierId,
          {
            transaction,
          }
        );

      if (!supplier) {
        await transaction.rollback();

        return res.status(404).json({
          success: false,

          message:
            "Supplier not found.",
        });
      }
    }


    /*
     * Items
     */

    const items =
      normalizeItems(
        rawItems || []
      );


    if (!items.length) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message:
          "At least one valid product is required.",
      });
    }


    /*
     * Totals
     */

    const totals =
      calculateTotals(
        items,
        {
          discount,
          tax,
          shippingCost,
          otherCharges,
          amountPaid,
        }
      );


    if (
      totals.amountPaid >
      totals.totalAmount
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message:
          "Amount paid cannot be greater than the purchase total.",
      });
    }


    /*
     * Replace draft items
     */

    await PurchaseItem.destroy({
      where: {
        purchaseId:
          purchase.id,
      },

      transaction,

      force: true,
    });


    /*
     * Update purchase
     */

    await purchase.update(
      {
        supplierId:
          supplierId ||
          purchase.supplierId,

        purchaseDate:
          purchaseDate ||
          purchase.purchaseDate,

        ...totals,

        paymentMethod:
          paymentMethod ||
          purchase.paymentMethod,

        notes:
          notes?.trim() ||
          null,

        invoiceNumber:
          invoiceNumber?.trim() ||
          null,
      },

      {
        transaction,
      }
    );


    /*
     * Re-create items
     */

    for (const item of items) {
      const product =
        await Product.findByPk(
          item.productId,
          {
            transaction,
          }
        );


      if (!product) {
        throw new Error(
          `Product "${item.productName || item.productId}" was not found.`
        );
      }


      let variant = null;


      if (item.variantId) {
        variant =
          await ProductVariant.findOne({
            where: {
              id: item.variantId,

              productId:
                product.id,
            },

            transaction,
          });


        if (!variant) {
          throw new Error(
            `Product variant for "${product.name}" was not found.`
          );
        }
      }


      const itemSubtotal =
        item.quantity *
        item.costPrice;


      const itemDiscount =
        Math.max(
          0,
          Number(
            item.discount || 0
          )
        );


      const itemTotal =
        Math.max(
          0,
          itemSubtotal -
            itemDiscount
        );


      await PurchaseItem.create(
        {
          purchaseId:
            purchase.id,

          productId:
            product.id,

          variantId:
            variant?.id ||
            null,

          productName:
            product.name,

          variantName:
            item.variantName ||
            (
              variant
                ? [
                    variant.size,
                    variant.color,
                  ]
                    .filter(Boolean)
                    .join(" / ")
                : null
            ),

          quantity:
            item.quantity,

          costPrice:
            item.costPrice,

          subtotal:
            itemSubtotal,

          discount:
            itemDiscount,

          total:
            itemTotal,
        },

        {
          transaction,
        }
      );
    }


    await transaction.commit();


    const updatedPurchase =
      await Purchase.findByPk(
        purchase.id,
        {
          include: [
            {
              model: Supplier,
              as: "Supplier",
            },

            {
              model: PurchaseItem,
              as: "Items",

              include: [
                {
                  model: Product,
                  as: "Product",

                  paranoid: false,
                },

                {
                  model: ProductVariant,
                  as: "Variant",
                },
              ],
            },
          ],
        }
      );


    return res.json({
      success: true,

      message:
        "Purchase updated successfully.",

      purchase:
        updatedPurchase,
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Update purchase error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to update purchase.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| DELETE / CANCEL PURCHASE
|--------------------------------------------------------------------------
|
| DRAFT:
|   Soft-delete only.
|
| RECEIVED:
|   Reverse stock first.
|   Create negative StockMovement records.
|   Then cancel/soft-delete purchase.
|
*/

const deletePurchase = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const purchase =
      await Purchase.findByPk(
        req.params.id,
        {
          include: [
            {
              model: PurchaseItem,
              as: "Items",
            },
          ],

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        }
      );


    if (!purchase) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message:
          "Purchase not found.",
      });
    }


    const recordedById =
      getRecordedById(
        req,
        purchase.recordedById
      );


    /*
     * Received purchase
     */

    if (
      purchase.status ===
      "received"
    ) {
      for (const item of purchase.Items) {
        await reversePurchaseItemStock({
          transaction,

          purchase,

          item,

          recordedById,
        });
      }
    }


    /*
     * Mark cancelled
     */

    await purchase.update(
      {
        status: "cancelled",
      },

      {
        transaction,
      }
    );


    /*
     * Soft delete because Purchase
     * uses paranoid: true.
     */

    await purchase.destroy({
      transaction,
    });


    await transaction.commit();


    return res.json({
      success: true,

      message:
        purchase.status ===
        "received"
          ? "Purchase cancelled and stock reversed successfully."
          : "Purchase cancelled successfully.",
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Delete purchase error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to cancel purchase.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| RECEIVE DRAFT PURCHASE
|--------------------------------------------------------------------------
|
| Draft → Received
|
| This is where stock is added and StockMovement records
| are created.
|
*/

const receivePurchase = async (
  req,
  res
) => {
  const transaction =
    await sequelize.transaction();

  try {
    const purchase =
      await Purchase.findByPk(
        req.params.id,
        {
          include: [
            {
              model: PurchaseItem,
              as: "Items",
            },
          ],

          transaction,

          lock:
            transaction.LOCK.UPDATE,
        }
      );


    if (!purchase) {
      await transaction.rollback();

      return res.status(404).json({
        success: false,

        message:
          "Purchase not found.",
      });
    }


    if (
      purchase.status !==
      "draft"
    ) {
      await transaction.rollback();

      return res.status(400).json({
        success: false,

        message:
          "Only draft purchases can be received.",
      });
    }


    const recordedById =
      getRecordedById(
        req,
        purchase.recordedById
      );


    /*
     * Receive every item.
     */

    for (const item of purchase.Items) {
      await receivePurchaseItem({
        transaction,

        purchase,

        item,

        recordedById,
      });
    }


    /*
     * Change purchase status.
     */

    await purchase.update(
      {
        status: "received",

        recordedById:
          recordedById ||
          purchase.recordedById ||
          null,
      },

      {
        transaction,
      }
    );


    await transaction.commit();


    const updatedPurchase =
      await Purchase.findByPk(
        purchase.id,
        {
          include: [
            {
              model: Supplier,
              as: "Supplier",
            },

            {
              model: PurchaseItem,
              as: "Items",

              include: [
                {
                  model: Product,
                  as: "Product",

                  paranoid: false,
                },

                {
                  model: ProductVariant,
                  as: "Variant",
                },
              ],
            },

            {
              model: User,
              as: "RecordedBy",

              required: false,

              attributes: [
                "id",
                "name",
                "email",
              ],
            },
          ],
        }
      );


    return res.json({
      success: true,

      message:
        "Purchase received and stock updated successfully.",

      purchase:
        updatedPurchase,
    });
  } catch (error) {
    await transaction.rollback();

    console.error(
      "Receive purchase error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        error.message ||
        "Unable to receive purchase.",
    });
  }
};


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {
  createPurchase,
  getPurchases,
  getPurchase,
  updatePurchase,
  deletePurchase,
  receivePurchase,
};