const User = require("./User");
const Staff = require("./Staff");
const StaffPenalty = require("./StaffPenalty");
const Attendance = require("./Attendance");
const StaffMovement = require("./StaffMovement");

const Service = require("./Service");
const ServiceCommission = require("./ServiceCommission");
const Commission = require("./Commission");

const Product = require("./Product");
const Category = require("./Category");
const Brand = require("./Brand");
const ProductVariant = require("./ProductVariant");
const Supplier = require("./supplier");

// Keep this if the model exists in your project
const ProductConsumptionItem = require("./ProductConsumptionItem");
const PurchaseItem = require("./PurchaseItem");
const StockMovement = require("./StockMovement");
const Purchase =require("./Purchase");
const Sale = require("./Sale");
const SaleItem = require("./saleItem");

const models = {
  User,
  Staff,
  StaffPenalty,
  Attendance,
  StaffMovement,

  Service,
  ServiceCommission,
  Commission,

  Product,
  Category,
  Brand,
  ProductVariant,

  ProductConsumptionItem,
  Supplier,
  PurchaseItem,
  StockMovement,
  Purchase,
  Sale,
  SaleItem,
};

/*
|--------------------------------------------------------------------------
| Initialize Associations
|--------------------------------------------------------------------------
*/

Object.values(models).forEach((model) => {
  if (typeof model.associate === "function") {
    model.associate(models);
  }
});

module.exports = models;