const { Op } = require("sequelize");
const { Supplier, Purchase } = require("../models");

const normalizeSupplier = (supplier) => {
  if (!supplier) return null;

  const data = supplier.toJSON ? supplier.toJSON() : supplier;

  return {
    ...data,
    openingBalance: Number(data.openingBalance || 0),
  };
};

/**
 * CREATE SUPPLIER
 */
const createSupplier = async (req, res) => {
  try {
    const {
      name,
      companyName,
      contactPerson,
      phone,
      email,
      address,
      city,
      state,
      country,
      taxNumber,
      bankName,
      accountNumber,
      accountName,
      openingBalance,
      notes,
      status,
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    const existingSupplier = await Supplier.findOne({
      where: {
        [Op.or]: [
          {
            name: String(name).trim(),
          },
          ...(phone
            ? [
                {
                  phone: String(phone).trim(),
                },
              ]
            : []),
        ],
      },
    });

    if (existingSupplier) {
      return res.status(409).json({
        success: false,
        message:
          existingSupplier.name?.toLowerCase() ===
          String(name).trim().toLowerCase()
            ? "A supplier with this name already exists."
            : "A supplier with this phone number already exists.",
      });
    }

    const supplier = await Supplier.create({
      name: String(name).trim(),
      companyName: companyName?.trim() || null,
      contactPerson: contactPerson?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city?.trim() || null,
      state: state?.trim() || null,
      country: country?.trim() || "Nigeria",
      taxNumber: taxNumber?.trim() || null,
      bankName: bankName?.trim() || null,
      accountNumber: accountNumber?.trim() || null,
      accountName: accountName?.trim() || null,
      openingBalance: Number(openingBalance || 0),
      notes: notes?.trim() || null,
      status: status === "inactive" ? "inactive" : "active",
    });

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully.",
      supplier: normalizeSupplier(supplier),
    });
  } catch (error) {
    console.error("CREATE SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create supplier.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET ALL SUPPLIERS
 */
const getSuppliers = async (req, res) => {
  try {
    const {
      search = "",
      status,
      page = 1,
      limit = 20,
    } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(
      Math.max(Number(limit) || 20, 1),
      100
    );

    const offset = (currentPage - 1) * pageLimit;

    const where = {};

    if (status && ["active", "inactive"].includes(status)) {
      where.status = status;
    }

    if (String(search).trim()) {
      const searchTerm = String(search).trim();

      where[Op.or] = [
        {
          name: {
            [Op.like]: `%${searchTerm}%`,
          },
        },
        {
          companyName: {
            [Op.like]: `%${searchTerm}%`,
          },
        },
        {
          contactPerson: {
            [Op.like]: `%${searchTerm}%`,
          },
        },
        {
          phone: {
            [Op.like]: `%${searchTerm}%`,
          },
        },
        {
          email: {
            [Op.like]: `%${searchTerm}%`,
          },
        },
      ];
    }

    const { rows, count } = await Supplier.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: pageLimit,
      offset,
    });

    return res.status(200).json({
      success: true,
      suppliers: rows.map(normalizeSupplier),
      pagination: {
        total: count,
        page: currentPage,
        limit: pageLimit,
        totalPages: Math.ceil(count / pageLimit),
      },
    });
  } catch (error) {
    console.error("GET SUPPLIERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch suppliers.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET SINGLE SUPPLIER
 */
const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    return res.status(200).json({
      success: true,
      supplier: normalizeSupplier(supplier),
    });
  } catch (error) {
    console.error("GET SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch supplier.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET SUPPLIER WITH PURCHASE HISTORY
 *
 * This is kept separate so the basic supplier endpoint
 * remains lightweight.
 */
const getSupplierDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    let purchases = [];

    if (Purchase) {
      purchases = await Purchase.findAll({
        where: {
          supplierId: id,
        },
        order: [["createdAt", "DESC"]],
      });
    }

    const supplierData = normalizeSupplier(supplier);

    const purchaseTotals = purchases.reduce(
      (acc, purchase) => {
        const data = purchase.toJSON
          ? purchase.toJSON()
          : purchase;

        const total = Number(
          data.totalAmount ||
            data.grandTotal ||
            data.total ||
            0
        );

        const paid = Number(
          data.paidAmount ||
            data.amountPaid ||
            0
        );

        acc.totalPurchases += total;
        acc.totalPaid += paid;
        acc.outstanding += Math.max(total - paid, 0);

        return acc;
      },
      {
        totalPurchases: 0,
        totalPaid: 0,
        outstanding: 0,
      }
    );

    return res.status(200).json({
      success: true,

      supplier: {
        ...supplierData,

        purchaseSummary: {
          totalPurchases: Number(
            purchaseTotals.totalPurchases.toFixed(2)
          ),

          totalPaid: Number(
            purchaseTotals.totalPaid.toFixed(2)
          ),

          outstanding: Number(
            (
              purchaseTotals.outstanding +
              Number(supplierData.openingBalance || 0)
            ).toFixed(2)
          ),

          purchaseCount: purchases.length,
        },
      },

      purchases: purchases.map((purchase) =>
        purchase.toJSON ? purchase.toJSON() : purchase
      ),
    });
  } catch (error) {
    console.error("GET SUPPLIER DETAILS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch supplier details.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * UPDATE SUPPLIER
 */
const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    const {
      name,
      companyName,
      contactPerson,
      phone,
      email,
      address,
      city,
      state,
      country,
      taxNumber,
      bankName,
      accountNumber,
      accountName,
      openingBalance,
      notes,
      status,
    } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Supplier name cannot be empty.",
      });
    }

    if (name !== undefined || phone !== undefined) {
      const duplicateConditions = [];

      if (name !== undefined && String(name).trim()) {
        duplicateConditions.push({
          name: String(name).trim(),
        });
      }

      if (phone !== undefined && String(phone).trim()) {
        duplicateConditions.push({
          phone: String(phone).trim(),
        });
      }

      if (duplicateConditions.length) {
        const duplicate = await Supplier.findOne({
          where: {
            id: {
              [Op.ne]: id,
            },
            [Op.or]: duplicateConditions,
          },
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message:
              duplicate.name?.toLowerCase() ===
              String(name || "").trim().toLowerCase()
                ? "Another supplier with this name already exists."
                : "Another supplier with this phone number already exists.",
          });
        }
      }
    }

    await supplier.update({
      ...(name !== undefined && {
        name: String(name).trim(),
      }),

      ...(companyName !== undefined && {
        companyName: companyName?.trim() || null,
      }),

      ...(contactPerson !== undefined && {
        contactPerson: contactPerson?.trim() || null,
      }),

      ...(phone !== undefined && {
        phone: phone?.trim() || null,
      }),

      ...(email !== undefined && {
        email: email?.trim() || null,
      }),

      ...(address !== undefined && {
        address: address?.trim() || null,
      }),

      ...(city !== undefined && {
        city: city?.trim() || null,
      }),

      ...(state !== undefined && {
        state: state?.trim() || null,
      }),

      ...(country !== undefined && {
        country: country?.trim() || "Nigeria",
      }),

      ...(taxNumber !== undefined && {
        taxNumber: taxNumber?.trim() || null,
      }),

      ...(bankName !== undefined && {
        bankName: bankName?.trim() || null,
      }),

      ...(accountNumber !== undefined && {
        accountNumber: accountNumber?.trim() || null,
      }),

      ...(accountName !== undefined && {
        accountName: accountName?.trim() || null,
      }),

      ...(openingBalance !== undefined && {
        openingBalance: Number(openingBalance || 0),
      }),

      ...(notes !== undefined && {
        notes: notes?.trim() || null,
      }),

      ...(status !== undefined && {
        status: status === "inactive" ? "inactive" : "active",
      }),
    });

    await supplier.reload();

    return res.status(200).json({
      success: true,
      message: "Supplier updated successfully.",
      supplier: normalizeSupplier(supplier),
    });
  } catch (error) {
    console.error("UPDATE SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update supplier.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * SOFT DELETE SUPPLIER
 */
const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    await supplier.destroy();

    return res.status(200).json({
      success: true,
      message: "Supplier moved to recycle bin.",
    });
  } catch (error) {
    console.error("DELETE SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete supplier.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

/**
 * GET DELETED SUPPLIERS
 */
const getDeletedSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.findAll({
      paranoid: false,
      where: {
        deletedAt: {
          [Op.ne]: null,
        },
      },
      order: [["deletedAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      suppliers: suppliers.map(normalizeSupplier),
    });
  } catch (error) {
    console.error("GET DELETED SUPPLIERS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch deleted suppliers.",
    });
  }
};

/**
 * RESTORE SUPPLIER
 */
const restoreSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id, {
      paranoid: false,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    if (!supplier.deletedAt) {
      return res.status(400).json({
        success: false,
        message: "Supplier is already active.",
      });
    }

    await supplier.restore();

    return res.status(200).json({
      success: true,
      message: "Supplier restored successfully.",
      supplier: normalizeSupplier(supplier),
    });
  } catch (error) {
    console.error("RESTORE SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to restore supplier.",
    });
  }
};

/**
 * PERMANENT DELETE
 */
const permanentlyDeleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await Supplier.findByPk(id, {
      paranoid: false,
    });

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found.",
      });
    }

    await supplier.destroy({
      force: true,
    });

    return res.status(200).json({
      success: true,
      message: "Supplier permanently deleted.",
    });
  } catch (error) {
    console.error("PERMANENT DELETE SUPPLIER ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        "Unable to permanently delete supplier. The supplier may be referenced by existing records.",
    });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  getSupplier,
  getSupplierDetails,
  updateSupplier,
  deleteSupplier,
  getDeletedSuppliers,
  restoreSupplier,
  permanentlyDeleteSupplier,
};