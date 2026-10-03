const express = require('express');
const bodyparser = require("body-parser");
const cors = require('cors');
const sequelize = require('./config/db');

// All routes

const authRoutes= require("./routers/authRoute");
const customerRoutes=require("./routers/loyaltyRouter");
const productRoute=require("./routers/productRoute");
const dashboardRoute=require("./routers/dashboardRoute");
const posRoute=require("./routers/posRoutes");
const recycleRoute=require("./routers/recyleRoute");
const expenseRouter=require("./routers/expenseRoute");
const staffRouter=require("./routers/staffRout");
const serviceRoute=require("./routers/serviceRoute");
const LoyalCardRoute=require("./routers/loyalcardRoute");
const commissionRoute=require("./routers/staffCommiRoute");
const reportRoute=require("./routers/reportRoute");
const settingRoute=require("./routers/settingRoute");
const heldSalesRoute=require("./routers/heldSaleRoutes");
const printRoute=require("./routers/printerRoute");
const dailyRoute=require("./routers/dailyRoute");
const returnRoute=require("./routers/returnRoute");
const kioskRoutes = require("./routers/kioskRoutes");
const attendanceRoutes=require("./routers/attendanceRoutes");
const settingsRoutes = require("./routers/companySettingsRoute");
const businessHoursRoutes = require("./routers/businessHoursRoutes");
const staffPenaltyRoutes = require("./routers/staffPenaltyRoutes");
const salesRouter=require("./routers/saleRoute");
const serviceCommissionRoutes = require('./routers/serviceCommissionRoutes')
const categoryRoute = require("./routers/categoryRoute");
const brandRoute = require("./routers/brandRoute");
const supplierRoute = require("./routers/supplierRoute");
const purchaseRoute = require("./routers/purchaseRoute");
const stockRoutes = require("./routers/stockRoutes");
//const retryPrintJobs =require('./service/retryPrintJobs');
//const syncOfflineSales =require('./service/syncOfflineSales');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyparser.json());
app.use(
  cors({
    origin: [
      'https://posfrontend-4v9e.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000',
    ],
    credentials: true,
  })
)

//const syncAll =require('./service/syncAll');

//(async()=>{

  // await syncAll();

//})();

//setInterval(async()=>{

  // await syncAll();

//},300000);
// Routes
app.use('/api/auth/', authRoutes);
app.use('/api/v1/', customerRoutes);
app.use('/api/v1/', productRoute);
app.use('/api/v1/', dashboardRoute);
app.use('/api/v1/', posRoute);
app.use('/api/v1/', recycleRoute);
app.use('/api/v1/', expenseRouter);
app.use('/api/v1/', serviceRoute);
app.use('/api/v1/', staffRouter);
app.use('/api/v1/', LoyalCardRoute);
app.use('/api/v1/', commissionRoute);
app.use('/api/v1/', reportRoute);
app.use('/api/v1/', settingRoute);
app.use('/api/v1/held-sales/', heldSalesRoute),
app.use('/api/v1/', printRoute);
app.use('/api/v1/', dailyRoute);
app.use("/api/v1/",returnRoute);
app.use("/api/v1/kiosk",kioskRoutes);
app.use("/api/v1/attendance", attendanceRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/business-hours",businessHoursRoutes);
app.use("/api/staff-penalties",staffPenaltyRoutes);
app.use("/api/v1/", salesRouter);
app.use('/api/v1/service-commissions',serviceCommissionRoutes,);
app.use("/api/v1/", categoryRoute);
app.use("/api/v1/", brandRoute);
app.use("/api/v1/", supplierRoute);
app.use("/api/v1/", purchaseRoute);
app.use("/api/v1", stockRoutes);

// Start the absence background job
require("./jobs/absenceJob");
//setInterval(() => {

  // syncOfflineSales();

//}, 60000);




  
//setInterval(()=>{

  // retryPrintJobs();

//},30000);
// Start server
sequelize.sync().then(() => {
    console.log('Database synced');

    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}); 
