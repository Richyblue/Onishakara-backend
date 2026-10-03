const HeldSale = require("../models/heldSale");
const Customer = require("../models/Customer");
const User = require("../models/User");
//const { saveOfflineRecord } = require("../service/offlineQueue");
//const db = require("../config/offlineDb");

exports.createHeldSale = async (req, res) => {
  try {
    const {
      customerId,
      items,
      subtotal,
      discount,
      totalAmount,
      note,
      loyaltyPointsUsed = 0,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const holdNumber = `HOLD-${Date.now()}`;

    const heldSale = await HeldSale.create({
      holdNumber,
      CustomerId: customerId || null,
      HeldById: req.user.id,
      items,
      subtotal,
      discount,
      totalAmount,
      loyaltyPointsUsed,
      note,
      status: "held",
    });

    return res.status(201).json({
      success: true,
      message: "Sale held successfully",
      heldSale,
    });
  } catch (error) {
    if (
      error.name === "SequelizeConnectionError" ||
      error.name === "SequelizeConnectionRefusedError" ||
      error.code === "ECONNREFUSED"
    ) {
      const holdNumber = `HOLD-${Date.now()}`;

      await saveHeldSaleOffline({
        holdNumber,

        customerId,

        heldById: req.user.id,

        items,

        subtotal,

        discount,

        totalAmount,

        loyaltyPointsUsed,

        note,
      });

      return res.status(200).json({
        success: true,

        offline: true,

        message: "Held sale saved locally",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//const db = require("../database/offlineDb");

exports.getHeldSales = async (req, res) => {
  try {
    const heldSales = await HeldSale.findAll({
      where: {
        HeldById: req.user.id,
        status: "held",
      },

      include: [
        {
          model: Customer,
          attributes: ["id", "fullname", "phone"],
        },

        {
          model: User,
          as: "HeldBy",
          attributes: ["id", "fullname"],
        },
      ],

      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      heldSales,
    });
  } catch (error) {
    console.error(error);

    // If MySQL is unavailable,
    // read from SQLite

    db.all(
      `
      SELECT *
      FROM held_sales
      WHERE heldById = ?
      AND status = 'held'
      ORDER BY createdAt DESC
      `,
      [req.user.id],
      (err, rows) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: err.message,
          });
        }

        rows.forEach((row) => {
          row.items = JSON.parse(row.items);
        });

        return res.status(200).json({
          success: true,
          offline: true,
          heldSales: rows,
        });
      }
    );
  }
};
exports.restoreHeldSale = async (req, res) => {
  try {
    const heldSale = await HeldSale.findByPk(req.params.id, {
      include: [
        {
          model: Customer,
        },
      ],
    });

    if (!heldSale) {
      return res.status(404).json({
        success: false,
        message: "Held sale not found",
      });
    }

    return res.status(200).json({
      success: true,
      sale: heldSale,
    });
  } catch (error) {
    db.get(
      `
      SELECT *
      FROM held_sales
      WHERE id = ?
      `,
      [req.params.id],
      (err,row)=>{
     
        if(!row){
     
           return res.status(404).json({
              success:false,
              message:'Held sale not found'
           });
     
        }
     
        row.items =
        JSON.parse(row.items);
     
        return res.json({
     
           success:true,
     
           sale:row
     
        });
     
      }
     );
  }
};
exports.deleteHeldSale = async (req, res) => {
  try {
    const { id } = req.params;

    const heldSale = await HeldSale.findByPk(id);

    if (!heldSale) {
      return res.status(404).json({
        success: false,
        message: "Held sale not found",
      });
    }

    await heldSale.destroy();

    return res.status(200).json({
      success: true,
      message: "Held sale deleted",
    });
  } catch (error) {
    console.error(error);

    db.run(
      `
      DELETE FROM held_sales
      WHERE id = ?
      `,
      [req.params.id],
      function(err){
     
        if(err){
     
           return res.status(500).json({
             success:false,
             message:err.message
           });
     
        }
     
        return res.json({
     
           success:true,
     
           message:
           'Held sale deleted'
     
        });
     
      }
     );
  }
};
