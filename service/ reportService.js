const { Op } = require("sequelize");

const Sale = require("../models/Sale");
const SaleItem = require("../models/saleItem");
const Product = require("../models/Product");
const Customer = require("../models/Customer");
const SalesReturn = require("../models/SalesReturn");

const calculateReport = async (where = {}) => {

    const sales = await Sale.findAll({
        where,
  
        include: [
          {
            model: Customer,
            attributes: ["id", "fullname", "phone"],
          },
  
          {
            model: User,
            as: "RecordedBy",
            attributes: ["id", "fullname"],
          },
  
          {
            model: Staff,
            as: "ServiceProvider",
            attributes: ["id", "position"],
            include: [
              {
                model: User,
                attributes: ["id", "fullname"],
              },
            ],
          },
  
          {
            model: saleItem,
            as: "SaleItems",
            include: [
              {
                model: Product,
              },
              {
                model: Service,
              },
            ],
          },
        ],
  
        order: [["createdAt", "DESC"]],
      });
  
      //------------------------------------------
      // Returns (using same date filter)
      //------------------------------------------
  
      const returnWhere = {
        status: "approved",
      };
  
      if (where.createdAt) {
        returnWhere.createdAt = where.createdAt;
      }
  
      const returns = await SalesReturn.findAll({
        where: returnWhere,
      });
  
      //------------------------------------------
      // KPI Variables
      //------------------------------------------
  
      let grossSales = 0;
  
      let totalReturns = 0;
  
      let netSales = 0;
  
      let totalServiceSales = 0;
  
      let totalProductSales = 0;
  
      let productProfit = 0;
  
      let ownerProfit = 0;
  
      let staffShare = 0;
  
      //------------------------------------------
      // Sales Calculations
      //------------------------------------------
  
      sales.forEach((sale) => {
        grossSales += Number(sale.totalAmount || 0);
  
        (sale.SaleItems || []).forEach((item) => {
          if (item.itemType === "service") {
            totalServiceSales += Number(item.subtotal || 0);
          }
  
          if (item.itemType === "product") {
            totalProductSales += Number(item.subtotal || 0);
  
            productProfit +=
              (
                Number(item.price) -
                Number(item.Product?.costPrice || 0)
              ) * Number(item.quantity);
          }
        });
      });
  
      //------------------------------------------
      // Returns Calculations
      //------------------------------------------
  
      totalReturns = returns.reduce(
        (sum, item) => sum + Number(item.totalRefund || 0),
        0
      );
  
      //------------------------------------------
      // Final Figures
      //------------------------------------------
  
      netSales = grossSales - totalReturns;
  
      ownerProfit = totalServiceSales * 0.7;
  
      staffShare = totalServiceSales * 0.3;
  
      const totalProfit = ownerProfit + productProfit;
  
      //------------------------------------------
  
      return res.status(200).json({
        success: true,
  
        grossSales,
  
        totalReturns,
  
        netSales,
  
        totalServiceSales,
  
        totalProductSales,
  
        ownerProfit,
  
        staffShare,
  
        productProfit,
  
        totalProfit,
  
        totalTransactions: sales.length,
  
        sales,
      });
};

module.exports = {
    calculateReport
};